# myapp/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET
from django.core.mail import EmailMessage
import json

from myapp.models import Course, TAUser, StaffUser


# -----------------------------
# LIST EITHER TAs or STAFF
# -----------------------------
@require_GET
def list_users_by_role(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    role = request.GET.get("role")
    if role == "TA":
        # Sort TAs by name, then surname
        ta_users = TAUser.objects.all().order_by("name", "surname")
        data = [{"email": u.email, "label": f"{u.name} {u.surname}"} for u in ta_users]
        return JsonResponse({"status": "success", "users": data})
    elif role == "Staff":
        # Sort Staff by name, then surname
        staff_users = StaffUser.objects.all().order_by("name", "surname")
        data = [{"email": s.email, "label": f"{s.name} {s.surname}"} for s in staff_users]
        return JsonResponse({"status": "success", "users": data})
    else:
        return JsonResponse({"status": "error", "message": "Invalid role parameter."}, status=400)


# -----------------------------
# SEND MAIL TO USER
# -----------------------------
@csrf_exempt
@require_POST
def send_mail_to_user(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    to_email = request.POST.get("to_email")
    message_text = request.POST.get("message")

    if not to_email or not message_text:
        return JsonResponse({"status": "error", "message": "Missing fields."}, status=400)

    try:
        # Construct the EmailMessage directly
        email = EmailMessage(
            subject="TA Management System Contact",
            body=message_text,
            from_email="tamanagementsystem@gmail.com",
            to=[to_email],
            reply_to=[session_email],  # replies go to user's real address
        )
        email.send(fail_silently=False)
        return JsonResponse({"status": "success", "message": "Mail sent."})
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Could not send email: {str(e)}"}, status=500)


# -----------------------------
# LIST ALL TAs (TABLE)
# -----------------------------
def list_all_tas(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    tas = TAUser.objects.all().order_by("name", "surname")
    data = []
    for ta in tas:
        data.append({
            "email": ta.email,
            "name": ta.name,
            "surname": ta.surname,
            "advisor": ta.advisor if ta.advisor else "-",
            "program": ta.program,
            "student_id": ta.student_id,
            "phone": ta.phone if ta.phone else "-",
        })
    return JsonResponse({"status": "success", "tas": data})


# -----------------------------
# LIST ALL STAFF (TABLE)
# -----------------------------
@require_GET
def list_all_staff(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    staff_users = StaffUser.objects.all().order_by("name", "surname").prefetch_related("courses_taught")
    data = []
    for s in staff_users:
        courses_list = []
        for c in s.courses_taught.all():
            courses_list.append(c.code)
        
        data.append({
            "email": s.email,
            "name": s.name,
            "surname": s.surname,
            "department": s.department if s.department else "-",
            "courses": courses_list,  # e.g. ["CS101", "CS105"]
        })
    return JsonResponse({"status": "success", "staff": data})


# -----------------------------
# LIST ALL COURSES (TABLE)
# -----------------------------
@require_GET
def list_all_courses(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    courses = Course.objects.all().prefetch_related("instructors")
    data = []
    for course in courses:
        instructor_list = []
        for inst in course.instructors.all():
            instructor_list.append(f"{inst.name} {inst.surname}")
        
        data.append({
            # "id": course.id,  # skip, this is for database
            "code": course.code,
            "name": course.name,
            "instructors": instructor_list,  # e.g. ["Alice Smith", "Bob Jones"]
        })
    return JsonResponse({"status": "success", "courses": data})


# -----------------------------
# CREATE NEW TA
# -----------------------------
@csrf_exempt
@require_POST
def create_ta(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    try:
        data = json.loads(request.body)
        required_fields = ['name', 'surname', 'student_id', 'tc_no', 'email', 'program']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }, status=400)

        # Create new TA
        ta = TAUser(
            name=data['name'],
            surname=data['surname'],
            student_id=data['student_id'],
            tc_no=data['tc_no'],
            email=data['email'],
            program=data['program'],
            iban=data.get('iban'),
            phone=data.get('phone'),
            advisor=data.get('advisor'),
            ta_type=data.get('ta_type')
        )
        
        if 'password' in data:
            ta.set_password(data['password'])
            
        ta.save()
        
        return JsonResponse({
            "status": "success",
            "message": "TA created successfully",
            "ta": {
                "email": ta.email,
                "name": ta.name,
                "surname": ta.surname
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=400)


# -----------------------------
# CREATE NEW STAFF
# -----------------------------
@csrf_exempt
@require_POST
def create_staff(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    try:
        data = json.loads(request.body)
        required_fields = ['name', 'surname', 'email']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }, status=400)

        # Create new Staff
        staff = StaffUser(
            name=data['name'],
            surname=data['surname'],
            email=data['email'],
            department=data.get('department')
        )
        
        if 'password' in data:
            staff.set_password(data['password'])
            
        staff.save()
        
        return JsonResponse({
            "status": "success",
            "message": "Staff created successfully",
            "staff": {
                "email": staff.email,
                "name": staff.name,
                "surname": staff.surname
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=400)


# -----------------------------
# CREATE NEW COURSE
# -----------------------------
@csrf_exempt
@require_POST
def create_course(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    try:
        data = json.loads(request.body)
        required_fields = ['code', 'name']
        for field in required_fields:
            if not data.get(field):
                return JsonResponse({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }, status=400)

        # Create new Course
        course = Course(
            code=data['code'],
            name=data['name']
        )
        course.save()
        
        # Add instructors if provided
        if 'instructor_emails' in data:
            for email in data['instructor_emails']:
                try:
                    instructor = StaffUser.objects.get(email=email)
                    course.instructors.add(instructor)
                except StaffUser.DoesNotExist:
                    return JsonResponse({
                        "status": "error",
                        "message": f"Instructor with email {email} not found"
                    }, status=404)
        
        return JsonResponse({
            "status": "success",
            "message": "Course created successfully",
            "course": {
                "code": course.code,
                "name": course.name
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=400)
