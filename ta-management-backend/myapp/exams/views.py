# myapp/exams/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.db import transaction
from datetime import datetime
import json

from myapp.userauth.helpers import find_user_by_email
from myapp.models import Course 
from myapp.exams.models import Exam


# -----------------------------
# CREATE AN EXAM
# -----------------------------
@require_POST
@transaction.atomic
def create_exam(request):
    # 1. Check user session
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    # 2. Ensure user's type is Staff
    user, user_type = find_user_by_email(email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can create exams."}, status=403)
    
    # 3. Parse POST body
    data = json.loads(request.body)
    course_id = data.get("course_id")
    date_str = data.get("date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    num_proctors = data.get("num_proctors", 1)
    classroom_name = data.get("classroom_name")
    student_count = data.get("student_count", 0)

    if not (course_id and date_str and start_time_str and end_time_str and classroom_name):
        return JsonResponse({"status": "error", "message": "Missing required fields."}, status=400)
    
    # 4. Fetch the course
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found."}, status=404)

    # 5. Ensure staff user actually teaches this course
    if not course.instructors.filter(email=user.email).exists():
        return JsonResponse({"status": "error", "message": "You do not teach this course."}, status=403)

    # 6. Convert date/time strings
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_obj = datetime.strptime(start_time_str, "%H:%M").time()
        end_obj = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format."}, status=400)
    
    # 7. Check start time < end time and classroom availability
    if start_obj >= end_obj:
        return JsonResponse({"status": "error", "message": "Start time must be before end time."}, status=400)
    
    is_available, message = is_classroom_available(classroom_name, date_obj, start_obj, end_obj)
    if not is_available:
        return JsonResponse({
            "status": "error", 
            "message": f"Cannot create exam: {message}"
        }, status=400)
    
    # 8. Create the exam
    exam = Exam.objects.create(
        instructor=user,
        course=course,
        date=date_obj,
        start_time=start_obj,
        end_time=end_obj,
        num_proctors=num_proctors,
        classroom_name=classroom_name,
        student_count=student_count
    )

    return JsonResponse({
        "status": "success",
        "message": "Exam created successfully!",
        "exam_id": exam.id
    }, status=201)


# -----------------------------
# LIST COURSES OF AN INSTRUCTOR
# -----------------------------
@require_GET
def list_staff_courses(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "You are not staff."}, status=403)

    # Fetch all courses that have 'user' in their instructors many-to-many
    courses = Course.objects.filter(instructors__email=user.email)
    data = []
    for course in courses:
        data.append({"id": course.id, "code": course.code, "name": course.name})

    return JsonResponse({"status": "success", "courses": data})


# -----------------------------
# LIST EXAMS OF AN INSTRUCTOR (with confirmed assignments)
# -----------------------------
@require_GET
def list_staff_exams(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "You are not staff."}, status=403)

    # Get all exams where the user is the instructor
    exams = Exam.objects.filter(instructor=user).select_related('course')
    
    exams_data = []
    for exam in exams:
        # Get confirmed TA assignments from the ProctoringAssignment relation.
        assigned_tas = list(exam.proctoringassignment.values_list('ta__email', flat=True))
        exams_data.append({
            "id": exam.id,
            "course_code": exam.course.code,
            "course_name": exam.course.name,
            "date": exam.date.strftime("%Y-%m-%d"),
            "start_time": exam.start_time.strftime("%H:%M"),
            "end_time": exam.end_time.strftime("%H:%M"),
            "classroom_name": exam.classroom_name,
            "num_proctors": exam.num_proctors,
            "student_count": exam.student_count,
            "assigned_tas": assigned_tas,
        })

    return JsonResponse({"status": "success", "exams": exams_data})


# -----------------------------
# LIST ASSIGNED EXAMS OF TAs
# -----------------------------
@require_GET
def list_ta_exams(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "You are not a TA."}, status=403)

    # Use the reverse relationship 'proctored_exams' defined on TAUser.
    assignments = user.proctored_exams.select_related('exam__course').all()
    exams_data = []
    for assignment in assignments:
        exam = assignment.exam
        exams_data.append({
            "id": exam.id,
            "course_code": exam.course.code,
            "course_name": exam.course.name,
            "date": exam.date.strftime("%Y-%m-%d"),
            "start_time": exam.start_time.strftime("%H:%M"),
            "end_time": exam.end_time.strftime("%H:%M"),
            "classroom_name": exam.classroom_name,
            "num_proctors": exam.num_proctors,
            "student_count": exam.student_count,
        })

    return JsonResponse({"status": "success", "exams": exams_data})


# -----------------------------
# DELETE AN EXAM (with workload adjustment)
# -----------------------------
@require_POST
def delete_exam(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "You are not staff."}, status=403)
    
    # Parse POST body
    data = json.loads(request.body)
    exam_id = data.get("exam_id")
    
    if not exam_id:
        return JsonResponse({"status": "error", "message": "Exam ID is required."}, status=400)
    
    try:
        # Find the exam and verify ownership
        exam = Exam.objects.get(id=exam_id)
        
        # Only allow deletion if the user is the instructor who created it
        if exam.instructor != user:
            return JsonResponse({"status": "error", "message": "You can only delete exams you created."}, status=403)
        
        # Calculate the exam duration in hours.
        duration_hours = (datetime.combine(exam.date, exam.end_time) - datetime.combine(exam.date, exam.start_time)).seconds // 3600
        
        # Decrement the workload for each assigned TA.
        assignments = exam.proctoringassignment.all()
        for assignment in assignments:
            ta = assignment.ta
            ta.workload = max(0, ta.workload - duration_hours)
            ta.save()
        
        # Delete the exam (which will cascade-delete the assignments).
        exam.delete()
        return JsonResponse({"status": "success", "message": "Exam deleted successfully."})
    
    except Exam.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Exam not found."}, status=404)


# -----------------------------
# CHECK CLASSROOM AVAILABILITY
# -----------------------------
def is_classroom_available(classroom_name, date_obj, start_time, end_time, exclude_exam_id=None):
    overlapping_exams = Exam.objects.filter(
        classroom_name=classroom_name,
        date=date_obj
    ).exclude(id=exclude_exam_id)
    
    # Check for any time overlap with existing exams
    for exam in overlapping_exams:
        # Check if the new exam's time range overlaps with any existing exam
        if (start_time < exam.end_time and end_time > exam.start_time):
            return False, f"Classroom already booked for {exam.course.code} from {exam.start_time} to {exam.end_time}"
    
    return True, "Classroom is available"
