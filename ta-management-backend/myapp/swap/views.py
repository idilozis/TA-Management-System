import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils import timezone

from myapp.userauth.helpers import find_user_by_email
from myapp.proctoring.models import ProctoringAssignment
from myapp.swap.models import SwapRequest
from myapp.notificationsystem.views import create_notification

from myapp.proctoring.views import advisor_department      
from datetime import timedelta, datetime
from django.db.models import Q, F, Value
from django.db.models.functions import Replace, Lower
from myapp.models import TAUser
from django.shortcuts import get_object_or_404
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from django.db.models import Case, When, Value, CharField, DateField

@csrf_exempt
@require_POST
@transaction.atomic
def create_swap(request):
    """Body: {"assignment_id": 123, "target_ta_email": "b@uni.edu"}"""
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    requester, role = find_user_by_email(email)
    if role != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can initiate swaps"}, status=403)

    data             = json.loads(request.body or "{}")
    assignment_id    = data.get("assignment_id")
    target_email     = data.get("target_ta_email")

    if not assignment_id or not target_email:
        return JsonResponse({"status": "error", "message": "Missing fields"}, status=400)

    try:
        assignment = ProctoringAssignment.objects.select_for_update().get(pk=assignment_id)
    except ProctoringAssignment.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Assignment not found"}, status=404)

    #They can't see them already might delete this later, this is just to be safe
    if assignment.ta != requester:
        return JsonResponse({"status": "error", "message": "This assignment is not yours"}, status=403)

    target_ta, target_role = find_user_by_email(target_email)
    if target_role != "TA":
        return JsonResponse({"status": "error", "message": "Target must be a TA"}, status=400)

    # Only one pending swap per assignment 
    if SwapRequest.objects.filter(original_assignment=assignment, status="pending").exists():
        return JsonResponse({"status": "error", "message": "There is already a pending swap for this assignment"}, status=400)

    swap = SwapRequest.objects.create(
        original_assignment = assignment,
        requested_by        = requester,
        requested_to        = target_ta,
    )

    create_notification(
        recipient_email=target_ta.email,
        message=f"{requester.name} wants to swap a proctoring with you."
    )

    return JsonResponse({"status": "success", "swap_id": swap.id})


@csrf_exempt
@require_POST
@transaction.atomic
def respond_swap(request, swap_id):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    responder, role = find_user_by_email(email)
    if role != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can respond"}, status=403)

    try:
        swap = SwapRequest.objects.select_for_update().get(pk=swap_id)
    except SwapRequest.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Swap not found"}, status=404)

    if swap.requested_to != responder: #They won't see them either, just to be safe
        return JsonResponse({"status": "error", "message": "You are not the target TA"}, status=403)
    if swap.status != "pending":
        return JsonResponse({"status": "error", "message": "Swap already processed"}, status=400)

    decision = (json.loads(request.body or "{}")).get("decision")  
    if decision not in ("accept", "reject"):
        return JsonResponse({"status": "error", "message": "Invalid decision"}, status=400)

    if decision == "reject":
        swap.status       = "rejected"
        swap.responded_at = timezone.now()
        swap.save(update_fields=["status", "responded_at"])

        create_notification(
            recipient_email=swap.requested_by.email,
            message=f"{responder.name} rejected your proctor‑swap request."
        )
        return JsonResponse({"status": "success", "message": "Swap rejected"})

    try:
        swap.accept()                        
        return JsonResponse({"status": "success", "message": "Swap completed"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

def serialize(sr, my_role):
    ta_initiator   = sr.requested_by          # may be None
    staff_initiator= getattr(sr, "requested_by_staff", None)

    target_exam    = sr.original_assignment.exam or sr.original_assignment.dean_exam

    if ta_initiator:
        initiator_str = f"{ta_initiator.name} (TA)"
    elif staff_initiator:
        initiator_str = f"{staff_initiator.name} (Staff)"
    else:
        initiator_str = "Unknown"

    if my_role == "sender":        # the TA who created the swap
        with_ta_email = sr.requested_to.email
    elif my_role == "receiver":    # the TA who received the request
        with_ta_email = (ta_initiator or sr.requested_to).email
    else:                       # secretary / admin view
        with_ta_email = sr.requested_to.email

    row = {
        "swap_id"   : sr.id,
        "role"      : my_role or "admin",
        "status"    : sr.status,
        "with_ta"   : with_ta_email,
        "created_at": sr.created_at.isoformat(),
        "initiator" : initiator_str,
    }
    
    # TA UI to show who they swapped with (for staff swaps)
    if sr.previous_ta:
        row["previous_ta"] = sr.previous_ta.email

    if sr.original_assignment.exam:         # normal exam
        row |= {
            "course_code"  : target_exam.course.code,
            "course_name"  : target_exam.course.name,
        }
    else:                                    # dean exam
        row |= {
            "course_code"  : ", ".join(target_exam.course_codes),
            "course_name"  : "",
        }

    row |= {
        "date"         : target_exam.date.isoformat(),
        "start_time"   : target_exam.start_time.strftime("%H:%M"),
        "end_time"     : target_exam.end_time.strftime("%H:%M"),
        "classrooms"   : target_exam.classrooms,
        "student_count": target_exam.student_count,
    }
    return row
    
@require_GET
def list_my_swaps(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, role = find_user_by_email(email)
    if role != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs have swaps"}, status=403)

    sent     = user.swap_requests_sent.all().select_related("original_assignment","requested_to")
    received = user.swap_requests_received.all().select_related("original_assignment","requested_by")

    def serialize(sr, my_role):
        ta_initiator    = sr.requested_by
        staff_initiator = getattr(sr, "requested_by_staff", None)
        target_exam     = sr.original_assignment.exam or sr.original_assignment.dean_exam

        # who kicked it off
        if ta_initiator:
            initiator_str = f"{ta_initiator.name} {ta_initiator.surname} (TA)"
        elif staff_initiator:
            initiator_str = f"{staff_initiator.name} {staff_initiator.surname} (Secretary)"
        else:
            initiator_str = "Unknown"

        # base row
        row = {
            "swap_id":   sr.id,
            "role":      my_role,
            "status":    sr.status,
            "initiator": initiator_str,
            "time":      sr.created_at.isoformat(),
            # course payload already exists:
            "course_code": target_exam.course.code if sr.original_assignment.exam else ", ".join(target_exam.course_codes),
            "course_name": target_exam.course.name if sr.original_assignment.exam else "",
            "date":        target_exam.date.isoformat(),
            "start_time":  target_exam.start_time.strftime("%H:%M"),
            "end_time":    target_exam.end_time.strftime("%H:%M"),
            "classrooms":  target_exam.classrooms,
            "student_count": target_exam.student_count,
        }

        # who you’re swapping with
        if my_role == "sender":
            # you sent it → sr.requested_to
            row["with_ta"]      = sr.requested_to.email
            row["with_ta_name"] = f"{sr.requested_to.name} {sr.requested_to.surname}"
        else:  # receiver
            row["with_ta"]      = sr.requested_by.email if sr.requested_by else ""
            row["with_ta_name"] = f"{sr.requested_by.name} {sr.requested_by.surname}" if sr.requested_by else ""

        return row

    data = [serialize(s, "sender")   for s in sent] + \
           [serialize(r, "receiver") for r in received]

    return JsonResponse({"status": "success", "swaps": data})

@require_GET
def swap_candidates(request, assignment_id):
    """Return two lists: assignable / unassignable with reasons for TA‐initiated swaps."""
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)
    user, role = find_user_by_email(email)
    if role != "TA":
        return JsonResponse({"status":"error","message":"Only TAs can fetch candidates"}, status=403)

    pa = get_object_or_404(ProctoringAssignment.objects.select_related("exam","dean_exam","ta"),
                           pk=assignment_id)
    if pa.ta != user:
        return JsonResponse({"status":"error","message":"Permission denied"}, status=403)

    # Is this a dean exam assignment?
    is_dean = pa.exam is None and pa.dean_exam is not None

    # Common data
    exam      = pa.exam or pa.dean_exam
    date      = exam.date
    slot      = f"{exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')}"
    instr_dept= None if is_dean else advisor_department(user.advisor)

    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )
    same_day  = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list("ta__email", flat=True)
    )
    adj_days = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date__in=[date - timedelta(1), date + timedelta(1)]) |
            Q(dean_exam__date__in=[date - timedelta(1), date + timedelta(1)])
        ).values_list("ta__email", flat=True)
    )
    conflicts = set(
        TAWeeklySlot.objects.filter(
            day=date.strftime("%a").upper(), time_slot=slot
        ).values_list("ta__email", flat=True)
    )

    assignable, unassignable = [], []
    for ta in TAUser.objects.filter(isTA=True):
        if ta == user:
            continue
        reasons = []
        if ta.email in leave_set:
            reasons.append("On leave")
        if ta.email in same_day:
            reasons.append("Same-day proctoring")
        if ta.email in adj_days:
            reasons.append("Day-before/after proctor")
        if ta.email in conflicts:
            reasons.append("Lecture conflict")
        # Only check department for normal exams
        if not is_dean and advisor_department(ta.advisor) != instr_dept:
            reasons.append("Different department")

        rec = {
            "email":    ta.email,
            "name":     f"{ta.name} {ta.surname}",
            "workload": ta.workload,
            "program":  ta.program,
        }

        if reasons:
            unassignable.append({**rec, "reason": "; ".join(reasons)})
        else:
            assignable.append(rec)

    assignable.sort(key=lambda x: x["workload"])
    return JsonResponse({"status":"success","assignable":assignable,"unassignable":unassignable})

@require_GET
def list_all_assignments(request):
    
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)

    user, _ = find_user_by_email(email)
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    order = request.GET.get("order_by", "date")
    
    assignments = (ProctoringAssignment.objects .select_related("exam__course", "dean_exam", "ta").annotate(
        sort_date=Case(
            When(exam__date__isnull=False, then=F("exam__date")),
            When(dean_exam__date__isnull=False, then=F("dean_exam__date")),
            output_field=DateField(),
        ),
        sort_course=Case(
            When(exam__course__code__isnull=False, then=F("exam__course__code")),
            When(dean_exam__course_codes__len__gt=0, then=F("dean_exam__course_codes")),  
            default=Value("ZZZ"),
            output_field=CharField(),
        )
    ))
    
    if order == "course":
        assignments = assignments.order_by("sort_course", "sort_date")
    else:
        assignments = assignments.order_by("sort_date", "sort_course")

    rows = []
    for pa in assignments:
        ex = pa.exam or pa.dean_exam

        course_code = (
            ex.course.code if pa.exam else ", ".join(ex.course_codes)
        )
        course_name = (
            ex.course.name if pa.exam else ""
        )

        rows.append({
            "assignment_id": pa.id,
            "ta_email"    : pa.ta.email,
            "ta_name"     : f"{pa.ta.name} {pa.ta.surname}",
            "course_code" : course_code,
            "course_name" : course_name,
            "date"        : ex.date.isoformat(),
            "start_time"  : ex.start_time.strftime("%H:%M"),
            "end_time"    : ex.end_time.strftime("%H:%M"),
            "classrooms"  : ex.classrooms,
            "student_count": ex.student_count,
        })
        
    return JsonResponse({"status": "success", "assignments": rows})

@require_GET
def candidate_tas_staff(request, assignment_id):
    """Return two lists: assignable / excluded with reasons for staff‐initiated swaps."""
    email = request.session.get("user_email")
    user, _ = find_user_by_email(email)
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status":"error"}, status=403)

    pa = get_object_or_404(ProctoringAssignment.objects.select_related("exam","dean_exam","ta"),
                           pk=assignment_id)
    # Is this a dean exam assignment?
    is_dean = pa.exam is None and pa.dean_exam is not None

    exam      = pa.exam or pa.dean_exam
    date      = exam.date
    slot      = f"{exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')}"
    instr_dept= None if is_dean else advisor_department(pa.ta.advisor)

    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )
    same_day  = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list("ta__email", flat=True)
    )
    adj_days = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date__in=[date - timedelta(1), date + timedelta(1)]) |
            Q(dean_exam__date__in=[date - timedelta(1), date + timedelta(1)])
        ).values_list("ta__email", flat=True)
    )
    conflicts = set(
        TAWeeklySlot.objects.filter(
            day=date.strftime("%a").upper(), time_slot=slot
        ).values_list("ta__email", flat=True)
    )

    assignable, excluded = [], []
    for ta in TAUser.objects.filter(isTA=True):
        reasons = []
        if ta.email in leave_set:
            reasons.append("On leave")
        if ta.email in same_day:
            reasons.append("Same-day proctor")
        if ta.email in adj_days:
            reasons.append("Day-before/after")
        if ta.email in conflicts:
            reasons.append("Lecture conflict")
        if not is_dean and advisor_department(ta.advisor) != instr_dept:
            reasons.append("Different department")

        rec = {
            "email":    ta.email,
            "name":     f"{ta.name} {ta.surname}",
            "workload": ta.workload,
            "program":  ta.program,
        }

        (excluded if reasons else assignable).append(
            {**rec, "reason": "; ".join(reasons)} if reasons else rec
        )

    assignable.sort(key=lambda x: x["workload"])
    return JsonResponse({"status":"success","assignable":assignable,"unassignable":excluded})

@csrf_exempt
@require_POST
@transaction.atomic
def staff_swap(request, assignment_id):
    user_email = request.session.get("user_email")
    user, _    = find_user_by_email(user_email)
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status": "error", "message": "Not authorized"}, status=403)

    pa = get_object_or_404(ProctoringAssignment, pk=assignment_id)
    data = json.loads(request.body or "{}")
    new_ta_email = data.get("new_ta")
    if not new_ta_email:
        return JsonResponse({"status": "error", "message": "new_ta missing"}, status=400)

    new_ta = get_object_or_404(TAUser, email=new_ta_email)
    if new_ta == pa.ta:
        return JsonResponse({"status": "error", "message": "Same TA"}, status=400)

    # Compute duration in hours
    exam = pa.exam or pa.dean_exam
    start = datetime.combine(exam.date, exam.start_time)
    end   = datetime.combine(exam.date, exam.end_time)
    hours = (end - start).total_seconds() / 3600.0

    old_ta = pa.ta

    # 1) Decrement old TA's workload
    TAUser.objects.filter(pk=old_ta.pk).update(workload=F("workload") - hours)

    # 2) Increment new TA's workload
    TAUser.objects.filter(pk=new_ta.pk).update(workload=F("workload") + hours)

    # 3) Reassign on the ProctoringAssignment
    pa.ta = new_ta
    pa.save(update_fields=["ta"])

    # 4) Create a SwapRequest record
    SwapRequest.objects.create(
        original_assignment=pa,
        requested_by_staff=user,
        requested_to=new_ta,
        previous_ta=old_ta,
        status="accepted",
        responded_at=timezone.now(),
    )

    # 5) Notifications
    create_notification(
        recipient_email=old_ta.email,
        message=f"You were replaced for {exam}."
    )
    create_notification(
        recipient_email=new_ta.email,
        message=f"You have been assigned to proctor {exam}."
    )

    return JsonResponse({"status": "success", "message": "Swap completed"})

@require_GET
def list_all_swaps(request):
    email = request.session.get("user_email")
    user, _ = find_user_by_email(email)
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    swaps = (
        SwapRequest.objects
        .select_related(
            "original_assignment__exam__course",
            "original_assignment__dean_exam",
            "requested_by",         
            "requested_by_staff",   
            "previous_ta",          
            "requested_to",         
        )
        .order_by("-created_at")
    )

    def _serialize_admin(sr):
        # 1) Figure out the “initiator” (who kicked this off)
        if sr.requested_by_staff:
            initiator = sr.requested_by_staff
        else:
            initiator = sr.requested_by

        initiator_name = (
            f"{initiator.name} {initiator.surname}"
            if initiator else
            "Unknown"
        )

        # 2) Figure out the “old TA” (previous to swap)
        if sr.previous_ta:
            old_ta = sr.previous_ta
        else:
            old_ta = sr.requested_by

        old_name = (
            f"{old_ta.name} {old_ta.surname}"
            if old_ta else
            "Unknown TA"
        )

        # 3) New TA
        new_ta = sr.requested_to
        new_name = f"{new_ta.name} {new_ta.surname}"

        # 4) Build the assignment label
        exam = sr.original_assignment.exam or sr.original_assignment.dean_exam
        code = exam.course.code if sr.original_assignment.exam else ", ".join(exam.course_codes)
        label = (
            f"{code} "
            f"{exam.date.strftime('%d.%m.%Y')} "
            f"{exam.start_time.strftime('%H:%M')}–{exam.end_time.strftime('%H:%M')}"
        )

        return {
            "id":           sr.id,
            # header
            "initiator":   old_name,
            "target":      new_name,
            "status":      sr.status,
            "time":        sr.created_at.isoformat(),
            # body
            "staff_name":  initiator_name,
            "previous_ta": old_name,
            "assignment":  label,
        }

    data = [_serialize_admin(sr) for sr in swaps]
    return JsonResponse({"status":"success","swaps":data})

@require_GET
def swap_assignment_history(request, assignment_id):
    swaps = (SwapRequest.objects.filter(original_assignment_id=assignment_id).select_related("requested_by", "requested_by_staff", "requested_to").order_by("created_at"))

    def describe(s):
        initiator = (
            f"{s.requested_by.name} (TA)"
            if s.requested_by else
            f"{s.requested_by_staff.name} (Staff)"
            if s.requested_by_staff else "Unknown"
        )
        return {
            "id": s.id,
            "initiator": initiator,
            "target": f"{s.requested_to.name}",
            "status": s.status,
            "time": s.created_at.isoformat(),
            "previous_ta": s.previous_ta.name,
        }

    return JsonResponse({
        "status": "success",
        "history": [describe(s) for s in swaps]
    })
