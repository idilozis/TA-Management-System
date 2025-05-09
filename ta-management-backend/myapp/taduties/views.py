import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction

from myapp.taduties.models import TADuty
from myapp.models import Course
from myapp.userauth.helpers import find_user_by_email
from myapp.notificationsystem.views import create_notification
from myapp.models import StaffUser

# -----------------------------
# CREATE A DUTY
# -----------------------------
@require_POST
@transaction.atomic
def create_duty(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can create duties"}, status=403)

    data = json.loads(request.body)
    duty_type = data.get("duty_type")
    date_str = data.get("date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    description = data.get("description", "")
    course_code = data.get("course_code")

    if not (duty_type and date_str and start_time_str and end_time_str and course_code):
        return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)

    # Parse the date/time
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_obj = datetime.strptime(start_time_str, "%H:%M").time()
        end_obj = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format"}, status=400)
    
    # Fetch the Course by its unique course code
    try:
        course = Course.objects.get(code=course_code)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course with the provided code not found"}, status=404)

    # Create the TADuty record
    duty = TADuty.objects.create(
        ta_user=user,
        course=course,
        duty_type=duty_type,
        date=date_obj,
        start_time=start_obj,
        end_time=end_obj,
        description=description,
        status="pending"
    )

    # NEW: Notify all instructors of the course
    if duty.course:
        for instructor in duty.course.instructors.all():
            create_notification(
                recipient_email=instructor.email,
                message=f"{user.name} {user.surname} created a duty request for course {duty.course.code}."
            )
    
    return JsonResponse({
        "status": "success",
        "message": "Duty created successfully.",
        "duty_id": duty.id
    })


# -----------------------------
# LIST TA'S ALL DUTIES
# -----------------------------
"""
    TAs can see all duties they have created (pending, approved, or rejected).
"""
@require_GET
def list_my_duties(request):
    session_email = request.session.get("user_email")
    
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can view their duties"}, status=403)

    duties = TADuty.objects.filter(ta_user=user).order_by("-date", "-start_time")

    def compute_duration(date, start_time, end_time): 
        start_dt = datetime.combine(date, start_time)
        end_dt = datetime.combine(date, end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1) 
        return (end_dt - start_dt).total_seconds() / 3600

    duty_list = []
    for duty in duties:
        duration_hours = compute_duration(duty.date, duty.start_time, duty.end_time)
        duty_list.append({
            "id": duty.id,
            "course": duty.course.code if duty.course else None,
            "duty_type": duty.get_duty_type_display(),
            "date": duty.date.isoformat(),
            "start_time": duty.start_time.strftime("%H:%M"),
            "end_time": duty.end_time.strftime("%H:%M"),
            "description": duty.description,
            "status": duty.get_status_display(),
            "duration_hours": duration_hours,
        })

    return JsonResponse({"status": "success", "duties": duty_list})


# -----------------------------
# LIST STAFF'S PENDING DUTIES
# -----------------------------
"""
    Staff (instructors) can see all 'pending' duties for courses they teach.
    Only duties with an associated course that the staff instructs are returned.
"""
@require_GET
def list_pending_duties(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can see pending duties"}, status=403)

    # Only include pending duties for courses taught by this staff user
    courses_taught = user.courses_taught.all()
    pending_duties = TADuty.objects.filter(status="pending", course__in=courses_taught).order_by("-date", "-start_time")
    
    def compute_duration(date, start_time, end_time): 
        start_dt = datetime.combine(date, start_time)
        end_dt = datetime.combine(date, end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1) 
        return (end_dt - start_dt).total_seconds() / 3600
    
    duty_list = []
    for duty in pending_duties:
        duration_hours = compute_duration(duty.date, duty.start_time, duty.end_time)   
        duty_list.append({
            "id": duty.id,
            "ta_email": duty.ta_user.email,
            "ta_name": f"{duty.ta_user.name} {duty.ta_user.surname}",
            "course": duty.course.code if duty.course else None,
            "duty_type": duty.get_duty_type_display(),
            "date": duty.date.isoformat(),
            "start_time": duty.start_time.strftime("%H:%M"),
            "end_time": duty.end_time.strftime("%H:%M"),
            "description": duty.description,
            "status": duty.get_status_display(),
            "duration_hours": duration_hours,
        })

    return JsonResponse({"status": "success", "duties": duty_list})


# -----------------------------
# UPDATE DUTY STATUS
# -----------------------------
"""
    Staff can approve or reject a duty if the duty's course is one they teach.
    If approved, its duration is added to the TA's total workload.
    Only pending duties can be updated.
"""
@csrf_exempt
@require_POST
@transaction.atomic
def update_duty_status(request, duty_id):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can update duties"}, status=403)

    try:
        duty = TADuty.objects.get(id=duty_id)
    except TADuty.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Duty not found"}, status=404)
    
    # Ensure the duty belongs to a course taught by this staff user.
    if not duty.course or duty.course not in user.courses_taught.all():
        return JsonResponse({"status": "error", "message": "You are not authorized to update this duty"}, status=403)
    
    if duty.status != "pending":
        return JsonResponse({"status": "error", "message": "Duty status cannot be updated"}, status=400)
    
    data = json.loads(request.body)
    new_status = data.get("status")
    if new_status not in ["approved", "rejected"]:
        return JsonResponse({"status": "error", "message": "Invalid status"}, status=400)
    
    # Helper function to compute duty duration in hours
    def compute_duration(date, start_time, end_time):
        start_dt = datetime.combine(date, start_time)
        end_dt = datetime.combine(date, end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        return (end_dt - start_dt).total_seconds() / 3600
    
    # Update the duty status
    duty.status = new_status
    duty.save()

    # Notify the TA about the updated duty status
    create_notification(
        recipient_email=duty.ta_user.email,
        message=f"Your duty request for course {duty.course.code} has been {new_status}."
    )

    # If approved, add the duty's duration to the TA's workload
    if new_status == "approved":
        duration_hours = compute_duration(duty.date, duty.start_time, duty.end_time)
        ta_user = duty.ta_user
        # Update workload (However, TAUser.workload is an IntegerField!)
        ta_user.workload += float(duration_hours)
        ta_user.save()

    return JsonResponse({"status": "success", "message": f"Duty {new_status}."})


# -----------------------------
# LIST STAFF'S PAST REQUESTS
# -----------------------------
"""
    Staffs can see all duties that are approved or rejected for courses they teach.
"""
@require_GET
def list_past_requests(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can see past duties"}, status=403)

    # Only include duties that are approved or rejected for courses taught by this staff user
    courses_taught = user.courses_taught.all()
    past_duties_qs = TADuty.objects.filter(
        course__in=courses_taught,
        status__in=["approved", "rejected"]
    ).order_by("-date", "-start_time")

    def compute_duration(date, start_time, end_time):
        start_dt = datetime.combine(date, start_time)
        end_dt = datetime.combine(date, end_time)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        return (end_dt - start_dt).total_seconds() / 3600

    duty_list = []
    for duty in past_duties_qs:
        duration_hours = compute_duration(duty.date, duty.start_time, duty.end_time)
        duty_list.append({
            "id": duty.id,
            "ta_email": duty.ta_user.email,
            "ta_name": f"{duty.ta_user.name} {duty.ta_user.surname}",
            "course": duty.course.code if duty.course else None,
            "duty_type": duty.get_duty_type_display(),
            "date": duty.date.isoformat(),
            "start_time": duty.start_time.strftime("%H:%M"),
            "end_time": duty.end_time.strftime("%H:%M"),
            "description": duty.description,
            "status": duty.get_status_display(),
            "duration_hours": duration_hours,
        })

    return JsonResponse({"status": "success", "duties": duty_list})


@require_POST
@transaction.atomic
def update_duty(request, duty_id):
    """
    Update an existing duty request.
    Only pending duties can be updated, and only by the TA who created them.
    The course cannot be changed.
    """
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can update duties"}, status=403)

    # Get the duty
    try:
        duty = TADuty.objects.get(id=duty_id)
    except TADuty.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Duty not found"}, status=404)
    
    # Check if the duty belongs to the TA
    if duty.ta_user != user:
        return JsonResponse({"status": "error", "message": "You can only update your own duties"}, status=403)
    
    # Check if the duty is still pending
    if duty.status != "pending":
        return JsonResponse({"status": "error", "message": "Only pending duties can be updated"}, status=400)
    
    # Parse request data
    data = json.loads(request.body)
    duty_type = data.get("duty_type")
    date_str = data.get("date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    description = data.get("description", "")
    
    # Validate required fields
    if not (duty_type and date_str and start_time_str and end_time_str):
        return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)
    
    # Parse the date/time
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_obj = datetime.strptime(start_time_str, "%H:%M").time()
        end_obj = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format"}, status=400)
    
    # Store original values for change detection
    changes = []
    if duty.duty_type != duty_type:
        changes.append(f"Type changed from {duty.get_duty_type_display()} to {duty_type}")
    
    if duty.date != date_obj:
        changes.append(f"Date changed from {duty.date.isoformat()} to {date_obj.isoformat()}")
    
    if duty.start_time.strftime("%H:%M") != start_time_str:
        changes.append(f"Start time changed from {duty.start_time.strftime('%H:%M')} to {start_time_str}")
    
    if duty.end_time.strftime("%H:%M") != end_time_str:
        changes.append(f"End time changed from {duty.end_time.strftime('%H:%M')} to {end_time_str}")
    
    if duty.description != description:
        changes.append("Description was updated")
    
    # Update the duty
    duty.duty_type = duty_type
    duty.date = date_obj
    duty.start_time = start_obj
    duty.end_time = end_obj
    duty.description = description
    duty.save()
    
    # Notify instructors about the changes if there were any
    if changes and duty.course:
        change_summary = ", ".join(changes)
        for instructor in duty.course.instructors.all():
            create_notification(
                recipient_email=instructor.email,
                message=f"{user.name} {user.surname} updated a duty request for course {duty.course.code}. Changes: {change_summary}"
            )
    
    return JsonResponse({
        "status": "success",
        "message": "Duty updated successfully.",
        "duty_id": duty.id
    })

