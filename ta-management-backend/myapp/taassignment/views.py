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
        .prefetch_related("must_have_ta", "preferred_tas", "preferred_graders", "avoided_tas")
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
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.must_have_ta.all()
            ],
            "preferred_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.preferred_tas.all()
            ],
            "preferred_graders": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.preferred_graders.all()
            ],
            "avoided_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.avoided_tas.all()
            ],
        })
    return JsonResponse({"status": "success", "assignments": data})

@csrf_exempt
@require_POST
def assign_tas(request):
    """
    Endpoint for staff to manually assign general TA(s) to a course.
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user_obj, user_type, is_allowed = check_staff_or_authorized(session_email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)
    
    data = json.loads(request.body)
    course_code = data.get("course_code")
    assigned_tas_emails = data.get("assigned_tas")
    if not course_code:
        return JsonResponse({"status": "error", "message": "Missing parameter"}, status=400)
    
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)
    
    try:
        assignment = TAAssignment.objects.get(course=course)
    except TAAssignment.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Assignment preference not found for this course"}, status=404)

    # Compute total load and build TA list
    total_load = 0
    assigned_tas_list = []
    for email in assigned_tas_emails:
        try:
            ta = TAUser.objects.get(email=email)
            assigned_tas_list.append(ta)
            # If ta_type is empty or "FT", count as 2; if "PT", count as 1.
            if not ta.ta_type or ta.ta_type == "FT":
                total_load += 2
            else:
                total_load += 1
        except TAUser.DoesNotExist:
            return JsonResponse({"status": "error", "message": f"TA with email {email} not found."}, status=404)
    
    # Check max load boundary
    if total_load > assignment.max_load:
        return JsonResponse({
            "status": "error", 
            "message": f"Total load ({total_load}) exceeds the maximum allowed ({assignment.max_load})."
        }, status=400)
    
    # Must-have TA check
    must_have_emails = [ta.email for ta in assignment.must_have_ta.all()]
    missing = [e for e in must_have_emails if e not in assigned_tas_emails]
    if missing and not data.get("force", False):
        return JsonResponse({
            "status": "warning",
            "message": f"The following must-have TAs are missing: {', '.join(missing)}.",
            "missing_must_have": missing,
            "require_confirmation": True
        }, status=202)

    if user_type == "Staff":
        staff = user_obj
    else:  # Authorized user
        staff = assignment.staff
    
    # Get or create the TAAllocation record.
    allocation, _ = TAAllocation.objects.get_or_create(staff=staff, course=course)
    allocation.assigned_tas.set(assigned_tas_list)
    allocation.save()
    
    # Send in-app notifications
    ta_message = (
        f"You have been assigned as a TA to {course.code} - {course.name} by "
        f"{user_obj.name} {user_obj.surname}."
    )
    for ta in assigned_tas_list:
        create_notification(recipient_email=ta.email, message=ta_message)

    instructors = course.instructors.all()
    if instructors.exists():
        assigned_ta_names = [f"{ta.name} {ta.surname}" for ta in assigned_tas_list]
        instr_message = (
            f"{', '.join(assigned_ta_names)} were assigned as TAs to your course {course.code} "
            f"by {user_obj.name} {user_obj.surname}."
        )
        for instructor in instructors:
            create_notification(recipient_email=instructor.email, message=instr_message)
        
    return JsonResponse({"status": "success", "message": "General TA(s) assigned successfully.", "total_load": total_load})


@csrf_exempt
@require_POST
def assign_graders(request):
    """
    Endpoint for staff to manually assign grader(s) to a course.
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user_obj, user_type, is_allowed = check_staff_or_authorized(session_email)
    if not is_allowed:
        return JsonResponse({"status": "error", "message": "Access denied"}, status=403)
    
    data = json.loads(request.body)
    course_code = data.get("course_code")
    grader_emails = data.get("assigned_graders")
    if not course_code:
        return JsonResponse({"status": "error", "message": "Missing parameter"}, status=400)
    
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)
    
    try:
        assignment = TAAssignment.objects.get(course=course)
    except TAAssignment.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Assignment preference not found for this course"}, status=404)
    
    if len(grader_emails) > assignment.num_graders:
        return JsonResponse({
            "status": "error",
            "message": f"Exactly {assignment.num_graders} grader(s) must be assigned."
        }, status=400)

    graders = []
    for email in grader_emails:
        try:
            ta = TAUser.objects.get(email=email)
            graders.append(ta)
        except TAUser.DoesNotExist:
            return JsonResponse({"status": "error", "message": f"TA with email {email} not found."}, status=404)
    
    if user_type == "Staff":
        staff = user_obj
    else:  # Authorized user
        staff = assignment.staff
    
    allocation, _ = TAAllocation.objects.get_or_create(staff=staff, course=course)
    allocation.assigned_graders.set(graders)
    allocation.save()

    # Send in-app notifications
    grader_message = (
        f"You have been assigned as a grader to {course.code} - {course.name} by "
        f"{user_obj.name} {user_obj.surname}."
    )
    for ta in graders:
        create_notification(recipient_email=ta.email, message=grader_message)

    instructors = course.instructors.all()
    if instructors.exists():
        grader_names = [f"{ta.name} {ta.surname}" for ta in graders]
        instr_message = (
            f"{', '.join(grader_names)} were assigned as graders to your course {course.code} by "
            f"{user_obj.name} {user_obj.surname}."
        )
        for instructor in instructors:
            create_notification(recipient_email=instructor.email, message=instr_message)

    return JsonResponse({"status": "success", "message": "Grader(s) assigned successfully."})


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
        .prefetch_related("assigned_tas", "assigned_graders")

    allocations_data = []
    for allocation in assignments:
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

    # filter TAs by advisor’s department
    result = []
    for ta in TAUser.objects.all():
        ta_dept = advisor_department(ta.advisor or "")
        if ta_dept and ta_dept.upper() == dept:
            result.append({
                "name": ta.name,
                "surname": ta.surname,
                "email": ta.email,
            })

    return JsonResponse({"status": "success", "tas": result})