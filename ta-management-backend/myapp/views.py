# myapp/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET, require_http_methods
from django.core.mail import EmailMessage
from myapp.userauth.helpers import find_user_by_email
from django.db import IntegrityError, transaction
import json

from myapp.models import Course, TAUser, StaffUser, AuthorizedUser, GlobalSettings

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
# ADMIN SETTINGS
# -----------------------------
@csrf_exempt
@require_http_methods(["GET", "POST"])
def global_settings(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "Authorized" or not getattr(user, 'isAuth', False):
        return JsonResponse({"status": "error", "message": "Only authorized users can view pending leave requests"}, status=403)

    # GET: fetch-or-create the singleton
    if request.method == "GET":
        settings, _ = GlobalSettings.objects.get_or_create(
            pk=1,
            defaults={
                "current_semester": "2024-2025 Spring",
                "max_ta_workload": 60,
            },
        )
        return JsonResponse({
            "status": "success",
            "settings": {
                "current_semester": settings.current_semester,
                "max_ta_workload": settings.max_ta_workload,
            }
        })

    # POST: only ADMIN may update
    try:
        auth_user = AuthorizedUser.objects.get(email=session_email)
    except AuthorizedUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Bad session"}, status=401)

    if auth_user.role != "ADMIN":
        return JsonResponse({"status": "error", "message": "Forbidden"}, status=403)

    # Parse & validate body JSON
    try:
        data = json.loads(request.body)
        sem = data["current_semester"]
        wl  = int(data["max_ta_workload"])
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        return JsonResponse({"status": "error", "message": f"Invalid input: {e}"}, status=400)

    settings = GlobalSettings.objects.get(pk=1)
    settings.current_semester = sem
    settings.max_ta_workload = wl
    settings.save()

    return JsonResponse({
        "status": "success",
        "settings": {
            "current_semester": settings.current_semester,
            "max_ta_workload": settings.max_ta_workload,
        }
    })


def require_admin(request):
    """
    Return a JsonResponse if the session user is missing / not an ADMIN.
    Otherwise return None.
    """
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    try:
        auth = AuthorizedUser.objects.get(email=email)
    except AuthorizedUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Bad session"}, status=401)
    if auth.role != "ADMIN":
        return JsonResponse({"status": "error", "message": "Forbidden"}, status=403)
    return None


# -----------------------------
# CREATE NEW TA
# -----------------------------
@csrf_exempt
@require_POST
def create_ta(request):
    # 1) admin check
    if err := require_admin(request):
        return err

    try:
        data = json.loads(request.body)
        for f in ("name", "surname", "student_id", "tc_no", "email", "program"):
            if not data.get(f):
                return JsonResponse(
                    {"status": "error", "message": f"Missing required field: {f}"},
                    status=400,
                )

        ta = TAUser(
            name=data["name"],
            surname=data["surname"],
            student_id=data["student_id"],
            tc_no=data["tc_no"],
            email=data["email"],
            program=data["program"],
            iban=data.get("iban"),
            phone=data.get("phone"),
            advisor=data.get("advisor"),
            ta_type=data.get("ta_type"),
        )
        if "password" in data:
            ta.set_password(data["password"])

        ta.save()
        return JsonResponse(
            {
                "status": "success",
                "message": "TA created successfully",
                "ta": {
                    "email": ta.email,
                    "name": ta.name,
                    "surname": ta.surname,
                },
            }
        )

    except IntegrityError:
        return JsonResponse(
            {"status": "error", "message": "TA with that email, student_id or TC already exists"},
            status=409,
        )
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# -----------------------------
# CREATE NEW STAFF
# -----------------------------
@csrf_exempt
@require_POST
def create_staff(request):
    # 1) admin check
    if err := require_admin(request):
        return err

    try:
        data = json.loads(request.body)
        for f in ("name", "surname", "email"):
            if not data.get(f):
                return JsonResponse(
                    {"status": "error", "message": f"Missing required field: {f}"},
                    status=400,
                )

        staff = StaffUser(
            name=data["name"],
            surname=data["surname"],
            email=data["email"],
            department=data.get("department"),
        )
        if "password" in data:
            staff.set_password(data["password"])

        staff.save()
        return JsonResponse(
            {
                "status": "success",
                "message": "Staff created successfully",
                "staff": {
                    "email": staff.email,
                    "name": staff.name,
                    "surname": staff.surname,
                },
            }
        )

    except IntegrityError:
        return JsonResponse(
            {"status": "error", "message": "Staff with that email already exists"},
            status=409,
        )
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# -----------------------------
# CREATE NEW COURSE
# -----------------------------
@csrf_exempt
@require_POST
def create_course(request):
    # 1) admin check
    if err := require_admin(request):
        return err

    try:
        data = json.loads(request.body)
        for f in ("code", "name"):
            if not data.get(f):
                return JsonResponse(
                    {"status": "error", "message": f"Missing required field: {f}"},
                    status=400,
                )

        with transaction.atomic():
            course = Course.objects.create(code=data["code"], name=data["name"])
            for email in data.get("instructor_emails", []):
                try:
                    inst = StaffUser.objects.get(email=email)
                except StaffUser.DoesNotExist:
                    return JsonResponse(
                        {"status": "error", "message": f"Instructor {email} not found"},
                        status=404,
                    )
                course.instructors.add(inst)

        return JsonResponse(
            {
                "status": "success",
                "message": "Course created successfully",
                "course": {
                    "code": course.code,
                    "name": course.name,
                    "instructors": list(course.instructors.values_list("email", flat=True)),
                },
            }
        )

    except IntegrityError:
        return JsonResponse(
            {"status": "error", "message": "Course code already exists"},
            status=409,
        )
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# -----------------------------
# DELETE COURSE
# -----------------------------
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_course(request, code):
    # only ADMIN
    if err := require_admin(request):
        return err

    try:
        course = Course.objects.get(code=code)
        course.delete()
        return JsonResponse({"status": "success", "message": "Course deleted"}, status=200)
    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)
    
# -----------------------------
# DELETE TA
# -----------------------------
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_ta(request, email):
    # only ADMIN
    if err := require_admin(request):
        return err

    try:
        ta = TAUser.objects.get(email=email)
        ta.delete()
        return JsonResponse({"status": "success", "message": "TA deleted"}, status=200)
    except TAUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "TA not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

# -----------------------------
# DELETE STAFF
# -----------------------------
@csrf_exempt
@require_http_methods(["DELETE"])
def delete_staff(request, email):
    # only ADMIN
    if err := require_admin(request):
        return err

    try:
        staff = StaffUser.objects.get(email=email)
        staff.delete()
        return JsonResponse({"status": "success", "message": "Staff deleted"}, status=200)
    except StaffUser.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Staff not found"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)
