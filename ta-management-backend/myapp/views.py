# myapp/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_POST, require_GET
from django.core.mail import EmailMessage
from django.conf import settings

from myapp.models import Course, TAUser, StaffUser


# -----------------------------
# LIST ALL COURSES
# -----------------------------
@require_GET
def list_courses(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    courses = Course.objects.all()
    data = []
    for course in courses:
        data.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
        })
    return JsonResponse({"status": "success", "courses": data})


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
