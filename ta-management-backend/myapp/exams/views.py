# myapp/exams/views.py
import json
from datetime import datetime
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST, require_GET
from django.db import transaction

from myapp.userauth.helpers import find_user_by_email
from myapp.models import Course 
from myapp.exams.models import Exam, DeanExam
from myapp.exams.classrooms import ClassroomEnum
from myapp.exams.courses_nondept import NonDeptCourseEnum
from myapp.proctoring.models import ProctoringAssignment  
from myapp.swap.models import SwapRequest 

REAL_COURSE_CODES = set(Course.objects.values_list("code", flat=True))

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
    
    # expect a classroom list
    classrooms = data.get("classrooms", [])
    if not classrooms or not isinstance(classrooms, list):
        return JsonResponse({
            "status":"error",
            "message":"`classrooms` must be a non-empty list."
        }, status=400)
    # validate enum
    valid = {v for v, _ in ClassroomEnum.choices()}
    for room in classrooms:
        if room not in valid:
            return JsonResponse({
                "status":"error",
                "message":f"Invalid classroom: {room}"
            }, status=400)

    course_id = data.get("course_id")
    date_str = data.get("date")
    start_str = data.get("start_time")
    end_str = data.get("end_time")
    num_proctors = data.get("num_proctors", 1)
    student_count = data.get("student_count", 0)

    if not all([course_id, date_str, start_str, end_str]):
        return JsonResponse({"status":"error","message":"Missing required fields."}, status=400)
    
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
        start_obj = datetime.strptime(start_str, "%H:%M").time()
        end_obj = datetime.strptime(end_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format."}, status=400)
    
    # 7. Check start time < end time
    if start_obj >= end_obj:
        return JsonResponse({"status": "error", "message": "Start time must be before end time."}, status=400)
    
    # 8. Check each classroom availability
    for room in classrooms:
        ok, msg = is_classroom_available(room, date_obj, start_obj, end_obj)
        if not ok:
            return JsonResponse({"status":"error","message":f"{room}: {msg}"}, status=400)
    
    # 8. Create the exam
    exam = Exam.objects.create(
        instructor=user,
        course=course,
        date=date_obj,
        start_time=start_obj,
        end_time=end_obj,
        num_proctors=num_proctors,
        student_count=student_count,
        classrooms = classrooms,
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
        assigned_tas = list(exam.proctoring_assignments.values_list('ta__email', flat=True))
        exams_data.append({
            "id": exam.id,
            "course_code": exam.course.code,
            "course_name": exam.course.name,
            "date": exam.date.strftime("%Y-%m-%d"),
            "start_time": exam.start_time.strftime("%H:%M"),
            "end_time": exam.end_time.strftime("%H:%M"),
            "classrooms": exam.classrooms,
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

    user, role = find_user_by_email(email)
    if role != "TA":
        return JsonResponse({"status": "error", "message": "You are not a TA"}, status=403)

    # Pull every proctoring row that belongs to this TA
    assignments = (
        ProctoringAssignment.objects
            .filter(ta=user)
            .select_related("exam__course", "dean_exam")   # single SQL round‑trip
    )

    exams = []
    for pa in assignments:
        if pa.exam:
            src   = pa.exam
            code  = src.course.code
            name  = src.course.name
        else:                               # Dean‑office exam
            src   = pa.dean_exam
            code  = ", ".join(src.course_codes)
            name  = ""                       # dean exams don’t store a name

        pending = SwapRequest.objects.filter(original_assignment=pa,status="pending").exists()
        
        exams.append({
            "assignment_id": pa.id,          
            "id"          : src.id,
            "course_code" : code,
            "course_name" : name,
            "date"        : src.date.strftime("%Y-%m-%d"),
            "start_time"  : src.start_time.strftime("%H:%M"),
            "end_time"    : src.end_time.strftime("%H:%M"),
            "classrooms"  : src.classrooms,
            "num_proctors": src.num_proctors,
            "student_count": src.student_count,
            "has_pending_swap": pending,
        })

    return JsonResponse({"status": "success", "exams": exams})


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
        assignments = exam.proctoring_assignments.all()
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
def is_classroom_available(room, date_obj, start_time, end_time, exclude_exam_id=None):
    qs = Exam.objects.filter(date=date_obj, classrooms__contains=[room])
    if exclude_exam_id:
        qs = qs.exclude(id=exclude_exam_id)

    for exam in qs:
        if start_time < exam.end_time and end_time > exam.start_time:
            return False, f"Booked by {exam.course.code} {exam.start_time}-{exam.end_time}"
    return True, "Available"

@require_GET
def list_classrooms(request):
    classrooms = [value for value, _ in ClassroomEnum.choices()]
    return JsonResponse({"status": "success", "classrooms": classrooms})


# -----------------------------
# DEAN OFFICE EXAM METHODS:
# -----------------------------
def _parse_datetime(date):
    date_obj = datetime.strptime(date["date"], "%Y-%m-%d").date()
    start = datetime.strptime(date["start_time"], "%H:%M").time()
    end = datetime.strptime(date["end_time"], "%H:%M").time()
    return date_obj, start, end

@require_GET
def list_dean_courses(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)
    user, user_type = find_user_by_email(email)
    if not user or not getattr(user, "isAuth",False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    # 1) Real courses from DB
    real = Course.objects.all().values("code", "name")

    # 2) Enum-only courses from NonDeptCourseEnum
    enum = [
        {"code": code, "name": label}
        for code, label in NonDeptCourseEnum.choices()
    ]

    # 3) Combine
    courses = list(real) + enum
    return JsonResponse({"status":"success","courses":courses})

@require_POST
@transaction.atomic
def create_dean_exam(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)
    user, user_type = find_user_by_email(email)
    if not user or not getattr(user,"isAuth",False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    data = json.loads(request.body)
    codes = data.get("course_codes", [])
    rooms = data.get("classrooms",  [])

    # basic checks
    if not isinstance(codes, list) or not codes:
        return JsonResponse({"status":"error","message":"`course_codes` list required"}, status=400)
    if not isinstance(rooms, list) or not rooms:
        return JsonResponse({"status":"error","message":"`classrooms` list required"}, status=400)

    # build allowed set
    real_codes = set(Course.objects.values_list("code", flat=True))
    enum_codes = {c for c, _ in NonDeptCourseEnum.choices()}
    allowed    = real_codes.union(enum_codes)

    # validate user‐submitted codes
    for c in codes:
        if c not in allowed:
            return JsonResponse({"status":"error","message":f"Invalid course code {c}"}, status=400)

    # classroom enum check unchanged
    valid_rooms = {v for v,_ in ClassroomEnum.choices()}
    for room in rooms:
        if room not in valid_rooms:
            return JsonResponse({"status":"error","message":f"Invalid classroom {room}"}, status=400)

    # parse date/time
    try:
        d = datetime.strptime(data["date"],       "%Y-%m-%d").date()
        s = datetime.strptime(data["start_time"], "%H:%M").time()
        e = datetime.strptime(data["end_time"],   "%H:%M").time()
    except ValueError:
        return JsonResponse({"status":"error","message":"Invalid date/time"}, status=400)
    if s >= e:
        return JsonResponse({"status":"error","message":"Start must be before end"}, status=400)

    # availability check unchanged
    for room in rooms:
        ok,msg = is_classroom_available(room, d, s, e)
        if not ok:
            return JsonResponse({"status":"error","message":msg}, status=400)

    # finally create
    dean_exam = DeanExam.objects.create(
        creator=user,
        course_codes=codes,
        date=d, start_time=s, end_time=e,
        num_proctors=data.get("num_proctors",1),
        student_count=data.get("student_count",0),
        classrooms=rooms,
    )
    return JsonResponse({"status":"success","exam_id":dean_exam.id}, status=201)


@require_GET
def list_dean_exams(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or not getattr(user, "isAuth", False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    qs = DeanExam.objects.order_by("-date", "-start_time")
    exams = []
    for ex in qs:
        exams.append({
            "id": ex.id,
            "course_codes": ex.course_codes,
            "date": ex.date.strftime("%Y-%m-%d"),
            "start_time": ex.start_time.strftime("%H:%M"),
            "end_time": ex.end_time.strftime("%H:%M"),
            "classrooms": ex.classrooms,
            "num_proctors": ex.num_proctors,
            "student_count": ex.student_count,
            "assigned_tas": list(ex.proctoring_assignments.values_list("ta__email", flat=True)),
        })

    return JsonResponse({"status":"success","exams":exams})

@require_POST
@transaction.atomic
def delete_dean_exam(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status":"error","message":"Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    # Only Authorized (Dean‐office) users may delete dean exams
    if not user or not getattr(user, "isAuth", False):
        return JsonResponse({"status":"error","message":"Not authorized"}, status=403)

    # Parse payload
    data = json.loads(request.body)
    exam_id = data.get("exam_id")
    if not exam_id:
        return JsonResponse({"status":"error","message":"Exam ID is required."}, status=400)

    # Fetch the DeanExam (404 if none)
    dean_exam = get_object_or_404(DeanExam, id=exam_id)

    # Compute duration in whole hours
    duration_hours = (
        datetime.combine(dean_exam.date, dean_exam.end_time)
        - datetime.combine(dean_exam.date, dean_exam.start_time)
    ).seconds // 3600

    # Decrement workload for each assigned TA
    assignments = dean_exam.proctoring_assignments.all()
    for assignment in assignments:
        ta = assignment.ta
        ta.workload = max(0, ta.workload - duration_hours)
        ta.save()

    # Delete the DeanExam (cascade removes ProctoringAssignment rows)
    dean_exam.delete()

    return JsonResponse({"status":"success","message":"Dean exam deleted successfully."})


@require_POST
@transaction.atomic
def update_exam(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can update exams."}, status=403)
    
    data = json.loads(request.body)
    
    exam_id = data.get("exam_id")
    if not exam_id:
        return JsonResponse({"status": "error", "message": "Exam ID is required."}, status=400)
    
    try:
        exam = Exam.objects.get(id=exam_id)
        if exam.instructor != user:
            return JsonResponse({"status": "error", "message": "You can only update exams you created."}, status=403)
    except Exam.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Exam not found."}, status=404)
    
    course_id = data.get("course_id")
    date_str = data.get("date")
    start_str = data.get("start_time")
    end_str = data.get("end_time")
    classrooms = data.get("classrooms", [])
    num_proctors = data.get("num_proctors", 1)
    student_count = data.get("student_count", 0)
    
    if not all([course_id, date_str, start_str, end_str]):
        return JsonResponse({"status": "error", "message": "Missing required fields."}, status=400)
    
    if not classrooms or not isinstance(classrooms, list):
        return JsonResponse({
            "status": "error",
            "message": "`classrooms` must be a non-empty list."
        }, status=400)
    
    valid = {v for v, _ in ClassroomEnum.choices()}
    for room in classrooms:
        if room not in valid:
            return JsonResponse({
                "status": "error",
                "message": f"Invalid classroom: {room}"
            }, status=400)
    
    try:
        course = Course.objects.get(id=course_id)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found."}, status=404)
    
    if not course.instructors.filter(email=user.email).exists():
        return JsonResponse({"status": "error", "message": "You do not teach this course."}, status=403)
    
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_obj = datetime.strptime(start_str, "%H:%M").time()
        end_obj = datetime.strptime(end_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format."}, status=400)
    
    if start_obj >= end_obj:
        return JsonResponse({"status": "error", "message": "Start time must be before end time."}, status=400)
    
    for room in classrooms:
        ok, msg = is_classroom_available(room, date_obj, start_obj, end_obj, exclude_exam_id=exam_id)
        if not ok:
            return JsonResponse({"status": "error", "message": f"{room}: {msg}"}, status=400)
    
    exam.course = course
    exam.date = date_obj
    exam.start_time = start_obj
    exam.end_time = end_obj
    exam.num_proctors = num_proctors
    exam.student_count = student_count
    exam.classrooms = classrooms
    exam.save()
    
    return JsonResponse({"status": "success", "message": "Exam updated successfully!", "exam_id": exam.id})