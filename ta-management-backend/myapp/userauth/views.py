# myapp/userauth/views.py
from django.http import JsonResponse
from django.contrib.auth import login as auth_login
from django.contrib.auth.hashers import check_password
from django.conf import settings
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction
from django.core.mail import send_mail
from django.core.cache import cache
from django.utils import timezone
import json
import secrets, datetime

from myapp.userauth.models import AuthLog
from .helpers import find_user_by_email

# -----------------------------
# LOGIN
# -----------------------------
@require_POST
@transaction.atomic
def login(request):
    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    user, user_type = find_user_by_email(email)
    if not user or not user.check_password(password):
        return JsonResponse({"status":"error","message":"Invalid credentials."}, status=401)

    # Record the successful login
    AuthLog.objects.create(
        user_email = user.email,
        user_type = user_type,
        action = AuthLog.LOGIN,
        ip_address = request.META.get("REMOTE_ADDR"),
        user_agent = request.META.get("HTTP_USER_AGENT","")[:255],
    )

    request.session["user_email"] = user.email
    return JsonResponse({
        "status": "success",
        "message": "Login successful.",
        "userType": user_type,
    })


# -----------------------------
# CSRF TOKEN
# -----------------------------
@ensure_csrf_cookie
def get_csrf_token(request): 
    return JsonResponse({"message": "CSRF cookie set."})


# -----------------------------
# GET CURRENT USER SESSION
# ----------------------------
@require_GET
def get_current_user(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    if user_type == "TA":
        payload = {
            "name": user.name,
            "surname": user.surname,
            "email": user.email,
            "program": user.program,
            "advisor": user.advisor,
            "isTA": True,
            "isAuth": False,
        }
    elif user_type == "Staff":
        payload = {
            "name": user.name,
            "surname": user.surname,
            "department": user.department,
            "email": user.email,
            "isTA": False,
            "isAuth": False,
        }
    else:  # Authorized
        payload = {
            "name":  user.name,
            "surname": user.surname,
            "email": user.email,
            "role":  user.role,
            "isTA":  False,
            "isAuth": True,
        }
    
    return JsonResponse({"status":"success","user": payload})

        
# -----------------------------
# FORGOT PASSWORD
# -----------------------------
@require_POST
def forgot_password(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        user, user_type = find_user_by_email(email)
        if not user:
            return JsonResponse({"message": "Email not found."}, status=404)
        
        # Generate a random token, expiring in 3 minutes.
        token = secrets.token_urlsafe(32)
        expiry_minutes = 3
        expiry_time = timezone.now() + datetime.timedelta(minutes=expiry_minutes)

        cache.set(
            f'password_reset_token_{token}',
            {'email': email, 'expiry': expiry_time},
            timeout = expiry_minutes * 60 # Cache timeout in seconds
        )

        # Send mail to the user.
        reset_link = f"http://localhost:3000/auth/reset-password?token={token}"
        try:
            send_mail(
                subject="Password Reset Request",
                message=f"Click here to reset your password: {reset_link}\n\nThis link will expire in {expiry_minutes} minutes.",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
            return JsonResponse({"message": "Password reset link sent!"}, status=200)
        except Exception as e:
            return JsonResponse({"message": "Email sending failed.", "error": str(e)}, status=500)

    return JsonResponse({"message": "Method not allowed"}, status=405)


# -----------------------------
# RESET PASSWORD
# -----------------------------
@require_POST
def reset_password(request):
    if request.method == "POST":
        data = json.loads(request.body)
        token = data.get("token")
        new_password = data.get("password")

        token_data = cache.get(f'password_reset_token_{token}')
        if not token_data:
            return JsonResponse({"message": "Invalid or expired reset link."}, status=400)
        
        # Check whether the token has expired
        if timezone.now() > token_data['expiry']:
            cache.delete(f'password_reset_token_{token}')
            return JsonResponse({"message": "Reset link has expired. Please request a new one."}, status=400)

        # Get email address from the token data
        email = token_data['email']

        user, user_type = find_user_by_email(email)
        if not user:
            return JsonResponse({"message": "Invalid email."}, status=400)

        # Set & save newly created password.
        user.set_password(new_password)
        user.save()

        cache.delete(f'password_reset_token_{token}')

        # Send mail to the user.
        try:
            login_link = "http://localhost:3000/"
            send_mail(
                subject="Password Successfully Reset",
                message=f"Your password has been successfully reset. Click here to login: {login_link}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
            return JsonResponse({
                "message": "Password reset successful! A confirmation email has been sent.",
                "redirect_url": login_link
            }, status=200)
        except Exception as e:
            return JsonResponse({
                "message": "Password reset successful, but email sending failed.",
                "error": str(e)
            }, status=500)

    return JsonResponse({"message": "Method not allowed"}, status=405)


# -----------------------------
# SETTINGS
# -----------------------------
@require_POST
def update_profile(request):
    data = json.loads(request.body)
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    # Validate current password before updating profile
    current_password = data.get("current_password")
    if current_password and not user.check_password(current_password):
        return JsonResponse({"status": "error", "message": "Invalid current password."}, status=401)

    new_name = data.get("name")
    new_surname = data.get("surname")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    # Validate password fields even if they are empty
    if new_password or confirm_password:
        # Check if both new password fields are filled
        if not new_password or not confirm_password:
            return JsonResponse({"status": "error", "message": "Both new password and confirmation are required."}, status=400)
        
        # Check password length
        if len(new_password) < 8:
            return JsonResponse({"status": "error", "message": "New password must be at least 8 characters."}, status=400)
        
        # Check password match
        if new_password != confirm_password:
            return JsonResponse({"status": "error", "message": "New passwords do not match."}, status=400)
        
        # Set new password
        user.set_password(new_password)

    if new_name:
        user.name = new_name
    if new_surname:
        user.surname = new_surname

    user.save()

    return JsonResponse({"status": "success", "message": "Profile updated successfully."})


# -----------------------------
# VERIFY PASSWORD
# -----------------------------
@csrf_exempt
@require_POST
def verify_password(request):
    """
    Verify current password before allowing profile update.
    """
    data = json.loads(request.body)
    password = data.get("password")

    # Get the currently authenticated user from the session
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    # Check if the current password is correct
    if check_password(password, user.password):
        return JsonResponse({"status": "success", "message": "Password verified."})
    else:
        return JsonResponse({"status": "error", "message": "Invalid password."}, status=401)


# -----------------------------
# LOG OUT
# -----------------------------
@csrf_exempt
@require_POST
def logout(request):
    email = request.session.get("user_email")
    user, user_type = (None, None)
    if email:
        user, user_type = find_user_by_email(email)

    if user:
        AuthLog.objects.create(
            user_email = email,
            user_type = user_type,
            action = AuthLog.LOGOUT,
            ip_address = request.META.get("REMOTE_ADDR"),
            user_agent = request.META.get("HTTP_USER_AGENT","")[:255],
        )

    request.session.flush()
    return JsonResponse({"status":"success","message":"Logged out."})


# -----------------------------
# FETCH AUTH LOGS
# -----------------------------
@require_GET
def get_auth_logs(request):
    email = request.session.get("user_email")
    user, user_type = find_user_by_email(email)
    if user_type != "Authorized":
        return JsonResponse({"status":"error","message":"Forbidden"}, status=403)

    # Fetch the last 50 logs
    logs = AuthLog.objects.all()[:50]
    data = [{
        "user_email": l.user_email,
        "user_type": l.user_type,
        "action": l.action,
        "when": l.timestamp.isoformat(),
        "ip": l.ip_address or "",
        "agent": l.user_agent,
    } for l in logs]

    return JsonResponse({"status":"success","logs": data})
