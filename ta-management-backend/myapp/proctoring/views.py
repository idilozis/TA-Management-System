# myapp/proctoring/views.py
import json
from datetime import datetime, timedelta

from django.db.models import Q, F, Value
from django.db.models.functions import Replace, Lower
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from myapp.userauth.helpers import find_user_by_email
from myapp.proctoring.utils import get_staff_exam_or_404, get_dean_exam_or_404
from myapp.models import TAUser, StaffUser
from myapp.proctoring.models import ProctoringAssignment
from myapp.proctoring.restrictions import ProctoringAssignmentSolver
from myapp.proctoring.deansolver import DeanProctoringSolver
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot


def advisor_department(advisor_name):
    """
    Look up a StaffUser by advisor_name "FirstName Surname" and return their department.
    """
    if not advisor_name:
        return None
    parts = advisor_name.split()
    firstname, surname = parts[0], parts[-1]
    staff = StaffUser.objects.filter(name__iexact=firstname, surname__iexact=surname).first()
    return staff.department if staff else None


@require_POST
def automatic_proctor_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"success": False}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    solver = ProctoringAssignmentSolver(exam)
    assigned_tas, info = solver.assign_with_overrides()

    return JsonResponse({
        "success": True,
        "assigned_tas": [ta.email for ta in assigned_tas],
        "override_info": {
            "consecutive_overridden": info["consec"],
            "ms_phd_overridden": info["ms"],
            "department_overridden": info["dept"],
        }
    })


@require_POST
def automatic_dean_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"success": False}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    solver = DeanProctoringSolver(dean_exam)
    assigned_tas, info = solver.assign_with_overrides()

    return JsonResponse({
        "success": True,
        "assigned_tas": [ta.email for ta in assigned_tas],
        "override_info": {
            "consecutive_overridden": info["consec"],
            "ms_phd_overridden": info["ms"],
            "department_overridden": info["dept"],
        }
    })


@require_POST
def confirm_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"success": False}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    data = json.loads(request.body)
    tas = data.get("assigned_tas", [])

    if len(tas) != exam.num_proctors:
        return JsonResponse({"success": False, "message": "Wrong number of TAs"}, status=400)

    ProctoringAssignment.objects.filter(exam=exam).delete()
    hours = (
        datetime.combine(exam.date, exam.end_time)
        - datetime.combine(exam.date, exam.start_time)
    ).seconds // 3600

    for email in tas:
        ta = TAUser.objects.get(email=email)
        pa = ProctoringAssignment(exam=exam, ta=ta)
        pa.full_clean()
        pa.save()
        ta.workload += hours
        ta.save()

    return JsonResponse({"success": True})


@require_POST
def confirm_dean_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"success": False}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    data = json.loads(request.body)
    tas = data.get("assigned_tas", [])

    if len(tas) != dean_exam.num_proctors:
        return JsonResponse({"success": False, "message": "Wrong number of TAs"}, status=400)

    ProctoringAssignment.objects.filter(dean_exam=dean_exam).delete()
    hours = (
        datetime.combine(dean_exam.date, dean_exam.end_time)
        - datetime.combine(dean_exam.date, dean_exam.start_time)
    ).seconds // 3600

    for email in tas:
        ta = TAUser.objects.get(email=email)
        pa = ProctoringAssignment(dean_exam=dean_exam, ta=ta)
        pa.full_clean()
        pa.save()
        ta.workload += hours
        ta.save()

    return JsonResponse({"success": True})


@require_GET
def candidate_tas(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"status": "error"}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    date = exam.date
    slot = f"{exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')}"
    norm_code = exam.course.code.replace(" ", "").lower()
    instr_dept = exam.instructor.department

    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )

    same_day = set(
        ProctoringAssignment.objects.filter(exam__date=date)
        .values_list("ta__email", flat=True)
    )

    adj_days = set(
        ProctoringAssignment.objects.filter(
            exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)]
        ).values_list("ta__email", flat=True)
    )

    enrolled = set(
        TAWeeklySlot.objects.annotate(
            norm=Lower(Replace(F("course"), Value(" "), Value("")))
        )
        .filter(norm=norm_code)
        .values_list("ta__email", flat=True)
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
        if ta.email in enrolled:
            reasons.append("Enrolled in course")
        if ta.email in conflicts:
            reasons.append("Lecture conflict")

        course_num = int("".join(filter(str.isdigit, exam.course.code)))
        if course_num >= 500 and ta.program != "PhD":
            reasons.append("MS/PhD only")

        ta_dept = advisor_department(ta.advisor)
        if ta_dept != instr_dept:
            reasons.append(f"Different dept ({ta_dept or 'unknown'})")

        rec = {
            "email": ta.email,
            "first_name": ta.name,
            "last_name": ta.surname,
            "workload": ta.workload,
            "program": ta.program,
            "department": ta_dept or "Unknown",
        }

        if reasons:
            excluded.append({**rec, "assignable": False, "reason": "; ".join(reasons)})
        else:
            penalty = 1 if ta.email in adj_days else 0
            assignable.append({**rec, "assignable": True, "penalty": penalty})

    assignable.sort(key=lambda x: (x["penalty"], x["workload"]))
    return JsonResponse({"status": "success", "tas": assignable + excluded})


@require_GET
def candidate_tas_dean(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status": "error"}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    date = dean_exam.date
    slot = f"{dean_exam.start_time.strftime('%H:%M')}-{dean_exam.end_time.strftime('%H:%M')}"

    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )

    same_day = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list("ta__email", flat=True)
    )

    adj_days = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)])
            | Q(dean_exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)])
        ).values_list("ta__email", flat=True)
    )

    conflicts = set(
        TAWeeklySlot.objects.filter(
            day=date.strftime("%a").upper(), time_slot=slot
        ).values_list("ta__email", flat=True)
    )

    all_tas = TAUser.objects.filter(isTA=True)
    result = []

    for ta in all_tas:
        reasons = []
        if ta.email in leave_set:
            reasons.append("On leave")
        if ta.email in same_day:
            reasons.append("Same-day proctor")
        if ta.email in adj_days:
            reasons.append("Day-before/after")
        if ta.email in conflicts:
            reasons.append("Lecture conflict")

        code0 = dean_exam.course_codes[0] if dean_exam.course_codes else ""
        course_num = int("".join(filter(str.isdigit, code0)))
        if course_num >= 500 and ta.program != "PhD":
            reasons.append("MS/PhD only")

        rec = {
            "email": ta.email,
            "first_name": ta.name,
            "last_name": ta.surname,
            "workload": ta.workload,
            "program": ta.program,
            "department": ta.advisor or "—",
        }

        if reasons:
            result.append({**rec, "assignable": False, "reason": "; ".join(reasons)})
        else:
            penalty = 1 if ta.email in adj_days else 0
            result.append({**rec, "assignable": True, "penalty": penalty})

    result.sort(key=lambda x: (0 if x["assignable"] else 1, x.get("penalty", 0), x["workload"]))
    return JsonResponse({"status": "success", "tas": result})


@require_POST
def ta_details(request):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff" and not getattr(user, "isAuth", False):
        return JsonResponse({"success": False}, status=403)

    emails = json.loads(request.body).get("emails", [])
    out = []

    for email in emails:
        ta = TAUser.objects.filter(email=email).first()
        if ta:
            out.append({
                "email": ta.email,
                "first_name": ta.name,
                "last_name": ta.surname,
                "workload": ta.workload,
                "program": ta.program,
            })

    return JsonResponse({"success": True, "tas": out})
