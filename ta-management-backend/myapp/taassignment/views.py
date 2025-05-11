# myapp/taassignment/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from myapp.userauth.helpers import find_user_by_email
from myapp.notificationsystem.views import create_notification
from myapp.utils import advisor_department
from myapp.models import AuthorizedUser, StaffUser, TAUser, Course
from myapp.taassignment.models import TAAssignment, TAAllocation
import json, re

def check_staff_or_authorized(email):
    user_obj, user_type = find_user_by_email(email)
    is_allowed = user_type in ("Staff", "Authorized")
    return user_obj, user_type, is_allowed

@require_GET
@ensure_csrf_cookie
def list_assignment_preferences(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    _, _, is_allowed = check_staff_or_authorized(email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)

    assignments = TAAssignment.objects.all().select_related("staff", "course") \
        .prefetch_related("must_have_ta", "preferred_tas", "preferred_graders", "avoided_tas") \
        .order_by("course__code", "staff__surname", "staff__name")
    
    data = []
    for assignment in assignments:
        data.append({
            "staff": {
                "name": assignment.staff.name,
                "surname": assignment.staff.surname,
                "email": assignment.staff.email,
            },
            "course": {
                "code": assignment.course.code,
                "name": assignment.course.name,
            },
            "min_load": assignment.min_load,
            "max_load": assignment.max_load,
            "num_graders": assignment.num_graders,
            "must_have_ta": [
                {
                    "name": ta.name,
                    "surname": ta.surname,
                    "email": ta.email,
                    "is_full_time": (ta.ta_type or "").strip().upper() != "PT",
                }
                for ta in assignment.must_have_ta.all()
            ],
            "preferred_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email, "is_full_time": (ta.ta_type or "").strip().upper() != "PT",}
                for ta in assignment.preferred_tas.all()
            ],
            "preferred_graders": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.preferred_graders.all()
            ],
            "avoided_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email, "is_full_time": (ta.ta_type or "").strip().upper() != "PT",}
                for ta in assignment.avoided_tas.all()
            ],
        })
    return JsonResponse({"status": "success", "assignments": data})


@csrf_exempt
@require_POST
def assign_tas(request):
    """
    Endpoint for a common user (staff or authorized) to manually assign to *a specific instructor's* course.
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user_obj, user_type, is_allowed = check_staff_or_authorized(session_email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)

    data = json.loads(request.body)
    course_code        = data.get("course_code")
    instructor_email   = data.get("instructor_email")
    assigned_tas_emails = data.get("assigned_tas")

    if not all([course_code, instructor_email, assigned_tas_emails]):
        return JsonResponse({"status": "error", "message": "Missing parameter"}, status=400)

    # 1) Fetch course
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)

    # 2) Fetch *that* instructor’s TAAssignment row
    try:
        owner      = StaffUser.objects.get(email=instructor_email)
        assignment = TAAssignment.objects.get(staff=owner, course=course)
    except (StaffUser.DoesNotExist, TAAssignment.DoesNotExist):
        return JsonResponse({
            "status": "error",
            "message": "No TA-preferences found for that instructor + course"
        }, status=404)

    # 3) Build TA list + total_load
    total_load = 0
    tas        = []
    for ta_email in assigned_tas_emails:
        try:
            ta = TAUser.objects.get(email=ta_email)
            tas.append(ta)
            total_load += 2 if (not ta.ta_type or ta.ta_type == "FT") else 1
        except TAUser.DoesNotExist:
            return JsonResponse({
                "status": "error",
                "message": f"TA not found: {ta_email}"
            }, status=404)

    # 4) Enforce max_load
    if total_load > assignment.max_load:
        return JsonResponse({
            "status": "error",
            "message": f"Total load {total_load} exceeds allowed {assignment.max_load}"
        }, status=400)

    # 5) Must-have check
    must_emails = [t.email for t in assignment.must_have_ta.all()]
    missing     = [e for e in must_emails if e not in assigned_tas_emails]
    if missing and not data.get("force"):
        return JsonResponse({
            "status": "warning",
            "message": f"Missing must-have TAs: {', '.join(missing)}",
            "missing_must_have": missing,
            "require_confirmation": True
        }, status=202)

    # 7) Create/update the TAAllocation
    allocation, _ = TAAllocation.objects.get_or_create(
        staff=owner,
        course=course
    )
    allocation.assigned_tas.set(tas)
    allocation.save()

    # 8) Notifications…
    ta_message = (
        f"You've been assigned as a TA to {course.code} - {course.name} by "
        f"{user_obj.name} {user_obj.surname}."
    )
    for t in tas:
        create_notification(recipient_email=t.email, message=ta_message)

    instrs = course.instructors.all()
    if instrs:
        names = ", ".join(f"{t.name} {t.surname}" for t in tas)
        instr_msg = (
            f"{names} were assigned as TAs to your course {course.code} "
            f"by {user_obj.name} {user_obj.surname}."
        )
        for instr in instrs:
            create_notification(recipient_email=instr.email, message=instr_msg)

    return JsonResponse({
        "status": "success",
        "message": "TAs assigned successfully",
        "total_load": total_load
    })



@csrf_exempt
@require_POST
def assign_graders(request):
    """
    Endpoint for a common user (staff or authorized) to manually assign grader(s) to *a specific instructor's* course.
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user_obj, user_type, is_allowed = check_staff_or_authorized(session_email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)

    data = json.loads(request.body)
    course_code       = data.get("course_code")
    instructor_email  = data.get("instructor_email")
    grader_emails     = data.get("assigned_graders")

    if not all([course_code, instructor_email, grader_emails]):
        return JsonResponse({"status": "error", "message": "Missing parameter"}, status=400)

    # 1) Fetch course & assignment
    try:
        course     = Course.objects.get(code=course_code)
        owner      = StaffUser.objects.get(email=instructor_email)
        assignment = TAAssignment.objects.get(staff=owner, course=course)
    except (Course.DoesNotExist, StaffUser.DoesNotExist, TAAssignment.DoesNotExist):
        return JsonResponse({
            "status": "error",
            "message": "Assignment preference not found for that instructor + course"
        }, status=404)

    # 2) Enforce exact number of graders
    if len(grader_emails) != assignment.num_graders:
        return JsonResponse({
            "status": "error",
            "message": f"You must assign exactly {assignment.num_graders} graders"
        }, status=400)

    # 3) Build grader list
    graders = []
    for email in grader_emails:
        try:
            graders.append(TAUser.objects.get(email=email))
        except TAUser.DoesNotExist:
            return JsonResponse({
                "status": "error",
                "message": f"TA not found: {email}"
            }, status=404)

    # 5) Create/update the TAAllocation
    allocation, _ = TAAllocation.objects.get_or_create(
        staff=owner,
        course=course
    )
    allocation.assigned_graders.set(graders)
    allocation.save()

    # 6) Notifications…
    msg = (
        f"You've been assigned as a grader to {course.code} - {course.name} by "
        f"{user_obj.name} {user_obj.surname}."
    )
    for g in graders:
        create_notification(recipient_email=g.email, message=msg)

    instrs = course.instructors.all()
    if instrs:
        names = ", ".join(f"{g.name} {g.surname}" for g in graders)
        instr_msg = (
            f"{names} were assigned as graders to your course {course.code} "
            f"by {user_obj.name} {user_obj.surname}."
        )
        for instr in instrs:
            create_notification(recipient_email=instr.email, message=instr_msg)

    return JsonResponse({"status": "success", "message": "Graders assigned successfully"})



@require_GET
def list_allocations(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)

    user_obj, user_type = find_user_by_email(email)
    if user_type not in ("Staff", "Authorized"):
        return JsonResponse({"status":"error","message":"Access denied"}, status=403)

    # Both Staff and Authorized Users can see all allocations
    assignments = TAAllocation.objects.all() \
        .select_related("course") \
        .prefetch_related("assigned_tas", "assigned_graders") \
        .order_by("course__code")

    allocations_data = []
    for allocation in assignments:
        instructor_email = allocation.staff.email
        tas = allocation.assigned_tas.all()
        graders = allocation.assigned_graders.all()

        ta_list = []
        for ta in tas:
            is_pt = getattr(ta, "ta_type", None) == "PT"
            ta_list.append({
                "name": ta.name,
                "surname": ta.surname,
                "email": ta.email,
                "is_full_time": not is_pt,
            })

        grader_list = [
            {"name": grader.name, "surname": grader.surname, "email": grader.email}
            for grader in graders
        ]

        total_load = sum(2 if getattr(ta, "ta_type", None) != "PT" else 1 for ta in tas)

        allocations_data.append({
            "instructor_email": instructor_email,
            "course": {
                "code": allocation.course.code,
                "name": allocation.course.name,
            },
            "assigned_tas": ta_list,
            "assigned_graders": grader_list,
            "total_load": total_load,
        })

    return JsonResponse({"status":"success","allocations": allocations_data})


@require_GET
def list_department_tas(request):
    """
    Returns all TAUser records whose department matches the
    alphabetical prefix of the given course_code (e.g. "CS" for "CS315").
    """
    user_email = request.session.get("user_email")
    if not user_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    _, _, is_allowed = check_staff_or_authorized(user_email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)

    # validate param
    code = request.GET.get("course_code", "").strip()
    if not code:
        return JsonResponse({"status": "error", "message": "Missing parameter: course_code"}, status=400)

    dept = "".join(ch for ch in code if ch.isalpha()).upper()
    if not dept:
        return JsonResponse({"status": "error", "message": "Invalid course_code format"}, status=400)

    # filter TAs by their advisor’s department
    result = []
    tas = TAUser.objects.all().order_by("name", "surname")
    for ta in tas:
        ta_dept = advisor_department(ta.advisor or "")
        if ta_dept and ta_dept.upper() == dept:
            result.append({
                "name": ta.name,
                "surname": ta.surname,
                "email": ta.email,
                "is_full_time": (ta.ta_type or "").strip().upper() != "PT",
            })

    return JsonResponse({"status": "success", "tas": result})