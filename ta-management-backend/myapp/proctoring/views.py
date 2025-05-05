# myapp/proctoring/views.py
import json
from datetime import datetime, timedelta
from django.db.models import Q, F, Value
from django.db.models.functions import Lower, Replace
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST

from myapp.userauth.helpers import find_user_by_email
from myapp.models import TAUser, StaffUser, Course
from myapp.exams.models import Exam
from myapp.proctoring.models import ProctoringAssignment
from myapp.proctoring.utils import get_staff_exam_or_404, get_dean_exam_or_404
from myapp.proctoring.restrictions import ProctoringAssignmentSolver
from myapp.proctoring.deansolver import DeanProctoringSolver
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.taassignment.models import TAAllocation
from myapp.models import GlobalSettings

# Precompute real-course codes
REAL_COURSE_CODES = set(Course.objects.values_list("code", flat=True))

def advisor_department(advisor_name):
    """Get TA's department from advisor name."""
    if not advisor_name:
        return None
    parts = advisor_name.split()
    staff = StaffUser.objects.filter(
        name__iexact=parts[0],
        surname__iexact=parts[-1]
    ).first()
    return staff.department if staff else None


def _filter_tas_for_course(course, date, start_time, end_time, instr_dept=None):
    """
    Helper function to filter TAs for a specific course/date/time.
    Returns two lists: assignable and excluded TAs.
    """
    slot = f"{start_time:%H:%M}-{end_time:%H:%M}"
    norm_code = course.code.replace(" ", "").lower()
    
    # Filter TAs on leave
    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )
    
    # Filter TAs with same day assignments
    same_day = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list("ta__email", flat=True)
    )
    
    # Filter TAs with adjacent day assignments
    adj_days = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)]) |
            Q(dean_exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)])
        ).values_list("ta__email", flat=True)
    )
    
    # Filter TAs enrolled in this course
    enrolled = set(
        TAWeeklySlot.objects.annotate(
            norm=Lower(Replace(F("course"), Value(" "), Value("")))
        )
        .filter(norm=norm_code)
        .values_list("ta__email", flat=True)
    )
    
    # Filter TAs with schedule conflicts
    conflicts = set(
        TAWeeklySlot.objects.filter(
            day=date.strftime("%a").upper(), time_slot=slot
        ).values_list("ta__email", flat=True)
    )
    
    alloc = (
        TAAllocation.objects
            .filter(course=course)
            .order_by('-created_at')
            .first()
    )
    allocated_emails = set()
    if alloc:
        allocated_emails = set(
            alloc.assigned_tas.values_list('email', flat=True)
        )

    settings = GlobalSettings.objects.first()
    max_wl = settings.max_ta_workload if settings else None

    assignable, excluded = [], []
    for ta in TAUser.objects.filter(isTA=True):
        reasons = []
        if max_wl is not None and ta.workload > max_wl:
            reasons.append("Over max workload")
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

        # Course level restriction (500+ courses need PhD students)
        course_num = int("".join(filter(str.isdigit, course.code)))
        if course_num >= 500 and ta.program != "PhD":
            reasons.append("MS/PhD only")

        # Department matching
        ta_dept = advisor_department(ta.advisor)
        if instr_dept and ta_dept != instr_dept:
            reasons.append(f"Different dept ({ta_dept or 'unknown'})")

        # Build record
        rec = {
            "email":      ta.email,
            "first_name": ta.name,
            "last_name":  ta.surname,
            "workload":   ta.workload,
            "program":    ta.program,
            "department": ta_dept or "Unknown",
            "already_assigned": ta.email in allocated_emails,
        }

        if reasons:
            excluded.append({**rec, "assignable": False, "reason": "; ".join(reasons)})
        else:
            penalty = 1 if ta.email in adj_days else 0
            assignable.append({**rec, "assignable": True, "penalty": penalty})

    # Sort by penalty then workload
    assignable.sort(
        key=lambda x: (
            not x["already_assigned"],
            x["penalty"], 
            x["workload"],
        )
    )
    return assignable, excluded


def _filter_tas_for_dean_enum(date, start_time, end_time):
    """
    Helper function to filter TAs for dean's enum courses.
    Returns a list of all TAs with assignable status.
    """
    slot = f"{start_time:%H:%M}-{end_time:%H:%M}"
    
    # Filter TAs on leave
    leave_set = set(
        TALeaveRequests.objects.filter(
            status="approved", start_date__lte=date, end_date__gte=date
        ).values_list("ta_user__email", flat=True)
    )
    
    # Filter TAs with same day assignments
    same_day = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list("ta__email", flat=True)
    )
    
    # Filter TAs with adjacent day assignments
    adj_days = set(
        ProctoringAssignment.objects.filter(
            Q(exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)]) |
            Q(dean_exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)])
        ).values_list("ta__email", flat=True)
    )
    
    # Filter TAs with schedule conflicts
    conflicts = set(
        TAWeeklySlot.objects.filter(
            day=date.strftime("%a").upper(), time_slot=slot
        ).values_list("ta__email", flat=True)
    )

    settings = GlobalSettings.objects.first()
    max_wl = settings.max_ta_workload if settings else None

    result = []
    for ta in TAUser.objects.filter(isTA=True):
        reasons = []
        if max_wl is not None and ta.workload > max_wl:
            reasons.append("Over max workload")
        if ta.email in leave_set:
            reasons.append("On leave")
        if ta.email in same_day:
            reasons.append("Same-day proctor")
        if ta.email in adj_days:
            reasons.append("Day-before/after")
        if ta.email in conflicts:
            reasons.append("Lecture conflict")

        rec = {
            "email":      ta.email,
            "first_name": ta.name,
            "last_name":  ta.surname,
            "workload":   ta.workload,
            "program":    ta.program,
            "department": ta.advisor or "—",
        }

        if reasons:
            result.append({**rec, "assignable": False, "reason": "; ".join(reasons)})
        else:
            penalty = 1 if ta.email in adj_days else 0
            result.append({**rec, "assignable": True, "penalty": penalty})

    result.sort(key=lambda x: (0 if x["assignable"] else 1, x.get("penalty", 0), x["workload"]))
    return result


def _create_exam_stub_for_course(course, date, start_time, end_time, num_proctors):
    """Create a stub Exam object for a course."""
    class StubExam: pass
    stub = StubExam()
    stub.course = course
    stub.date = date
    stub.start_time = start_time
    stub.end_time = end_time
    stub.num_proctors = num_proctors
    
    # Try to get an instructor if the course has any
    if hasattr(course, 'instructors') and course.instructors.exists():
        stub.instructor = course.instructors.first()
    return stub


@require_POST
def automatic_proctor_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"success": False}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    solver = ProctoringAssignmentSolver(exam)
    assigned, info = solver.assign_with_overrides()

    return JsonResponse({
        "success": True,
        "assigned_tas": [ta.email for ta in assigned],
        "override_info": {
            "consecutive_overridden": info["consec"],
            "ms_phd_overridden":     info["ms"],
            "department_overridden": info["dept"],
        }
    })


@require_POST
def automatic_dean_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"success": False}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    codes = dean_exam.course_codes

    # Check if the course exists in the Course model
    if len(codes) == 1 and codes[0] in REAL_COURSE_CODES:
        # Single real-Course code: staff solver stub (respects dept)
        course = Course.objects.get(code=codes[0])
        stub = _create_exam_stub_for_course(
            course=course,
            date=dean_exam.date,
            start_time=dean_exam.start_time,
            end_time=dean_exam.end_time,
            num_proctors=dean_exam.num_proctors
        )
        
        solver = ProctoringAssignmentSolver(stub)
    else:
        # Pure-enum exam: dean solver (all-TA candidate list)
        solver = DeanProctoringSolver(dean_exam)

    assigned, info = solver.assign_with_overrides()
    return JsonResponse({
        "success": True,
        "assigned_tas": [ta.email for ta in assigned],
        "override_info": info,
    })


@require_POST
def confirm_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"success": False}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    tas = json.loads(request.body).get("assigned_tas", [])
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
        pa.full_clean(); pa.save()
        ta.workload += hours; ta.save()

    return JsonResponse({"success": True})


@require_POST
def confirm_dean_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"success": False}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    tas = json.loads(request.body).get("assigned_tas", [])
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
        pa.full_clean(); pa.save()
        ta.workload += hours; ta.save()

    return JsonResponse({"success": True})


@require_GET
def candidate_tas(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if role != "Staff":
        return JsonResponse({"status": "error"}, status=403)

    exam = get_staff_exam_or_404(exam_id)
    
    # Use helper to filter TAs
    assignable, excluded = _filter_tas_for_course(
        course=exam.course,
        date=exam.date,
        start_time=exam.start_time,
        end_time=exam.end_time,
        instr_dept=exam.instructor.department
    )
    
    return JsonResponse({"status": "success", "tas": assignable + excluded})


@require_GET
def candidate_tas_dean(request, exam_id):
    user, role = find_user_by_email(request.session.get("user_email"))
    if not getattr(user, "isAuth", False):
        return JsonResponse({"status": "error"}, status=403)

    dean_exam = get_dean_exam_or_404(exam_id)
    codes = dean_exam.course_codes

    # Check if this is a single real course
    if len(codes) == 1 and codes[0] in REAL_COURSE_CODES:
        # Get the actual course
        course = Course.objects.get(code=codes[0])
        
        # Get the department from the course's instructor
        instructor = None
        if hasattr(course, 'instructors') and course.instructors.exists():
            instructor = course.instructors.first()
        instr_dept = instructor.department if instructor else None
        
        # Use helper to filter TAs using the same rules as candidate_tas
        assignable, excluded = _filter_tas_for_course(
            course=course,
            date=dean_exam.date,
            start_time=dean_exam.start_time,
            end_time=dean_exam.end_time,
            instr_dept=instr_dept
        )
        
        return JsonResponse({"status": "success", "tas": assignable + excluded})
    
    # For enum courses, use the dean-only logic
    tas_list = _filter_tas_for_dean_enum(
        date=dean_exam.date,
        start_time=dean_exam.start_time,
        end_time=dean_exam.end_time
    )
    
    return JsonResponse({"status": "success", "tas": tas_list})


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
                "email":      ta.email,
                "first_name": ta.name,
                "last_name":  ta.surname,
                "workload":   ta.workload,
                "program":    ta.program,
            })
    return JsonResponse({"success": True, "tas": out})
