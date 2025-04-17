# myapp/taassignment/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from myapp.userauth.helpers import find_user_by_email
import json
from myapp.models import StaffUser, TAUser, Course
from myapp.taassignment.models import TAAssignment, TAAllocation

@require_GET
@ensure_csrf_cookie
def list_assignment_preferences(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

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
    Expects JSON payload with: 
      - course_code (string)
      - assigned_tas (list of TA emails)
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    try:
        staff = StaffUser.objects.get(email=session_email)
    except StaffUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Staff user not found"}, status=404)
    
    data = json.loads(request.body)
    course_code = data.get("course_code")
    assigned_tas_emails = data.get("assigned_tas")
    if not course_code or not assigned_tas_emails:
        return JsonResponse({"status": "error", "message": "Missing parameters"}, status=400)
    
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)
    
    try:
        assignment = TAAssignment.objects.get(staff=staff, course=course)
    except TAAssignment.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Assignment preference not found for this course"}, status=404)

    # Compute total load.
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
    
    # Check load boundaries.
    if total_load < assignment.min_load:
        return JsonResponse({
            "status": "error", 
            "message": f"Total load ({total_load}) is below the minimum required ({assignment.min_load})."
        }, status=400)
    if total_load > assignment.max_load:
        return JsonResponse({
            "status": "error", 
            "message": f"Total load ({total_load}) exceeds the maximum allowed ({assignment.max_load})."
        }, status=400)
    
    force_override = data.get("force", False)

    # Check if all must-have TAs are included
    must_have_emails = [ta.email for ta in assignment.must_have_ta.all()]
    missing_must_haves = [email for email in must_have_emails if email not in assigned_tas_emails]

    if missing_must_haves and not force_override:
        return JsonResponse({
            "status": "warning",
            "message": f"The following must-have TAs are missing: {', '.join(missing_must_haves)}. Submit again with force=true to override.",
            "missing_must_have": missing_must_haves,
            "require_confirmation": True
        }, status=202)

    
    # Get or create the TAAllocation record.
    allocation, created = TAAllocation.objects.get_or_create(
        staff=staff, course=course
    )
    allocation.assigned_tas.clear()
    for ta in assigned_tas_list:
        allocation.assigned_tas.add(ta)
    allocation.save()
    return JsonResponse({"status": "success", "message": "General TA(s) assigned successfully.", "total_load": total_load})


@csrf_exempt
@require_POST
def assign_graders(request):
    """
    Endpoint for staff to manually assign grader(s) to a course.
    Expects JSON payload with: 
      - course_code (string)
      - assigned_graders (list of TA emails)
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    try:
        staff = StaffUser.objects.get(email=session_email)
    except StaffUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Staff user not found"}, status=404)
    
    data = json.loads(request.body)
    course_code = data.get("course_code")
    assigned_graders_emails = data.get("assigned_graders")
    if not course_code or not assigned_graders_emails:
        return JsonResponse({"status": "error", "message": "Missing parameters"}, status=400)
    
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)
    
    try:
        assignment = TAAssignment.objects.get(staff=staff, course=course)
    except TAAssignment.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Assignment preference not found for this course"}, status=404)
    
    required = assignment.num_graders
    if len(assigned_graders_emails) != required:
        return JsonResponse({
            "status": "error",
            "message": f"Exactly {required} grader(s) must be assigned."
        }, status=400)

    assigned_graders_list = []
    for email in assigned_graders_emails:
        try:
            ta = TAUser.objects.get(email=email)
            assigned_graders_list.append(ta)
        except TAUser.DoesNotExist:
            return JsonResponse({"status": "error", "message": f"TA with email {email} not found."}, status=404)
    
    allocation, created = TAAllocation.objects.get_or_create(
        staff=staff, course=course
    )
    allocation.assigned_graders.clear()
    for ta in assigned_graders_list:
        allocation.assigned_graders.add(ta)
    allocation.save()
    return JsonResponse({"status": "success", "message": "Grader(s) assigned successfully."})


@require_GET
def list_allocations(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)

    user_obj, user_type = find_user_by_email(email)

    # Only Staff and Authorized can see allocations
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
