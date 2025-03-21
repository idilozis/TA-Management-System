# myapp/userauth/views.py
from django.http import JsonResponse
from django.contrib.auth import login as auth_login
from django.conf import settings
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db import transaction
from django.core.mail import send_mail
from django.core.cache import cache
from django.utils import timezone
import json
import secrets, datetime

from .helpers import find_user_by_email


# -----------------------------
# LOGIN
# -----------------------------
@require_POST
@transaction.atomic
def login(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        # Check E-mail
        user, user_type = find_user_by_email(email)
        if not user:
            return JsonResponse({"status": "error", "message": "Invalid credentials."}, status=401)

        # Check Password
        if user.check_password(password):
            request.session["user_email"] = user.email # Store user in session.
            return JsonResponse({
                "status": "success",
                "message": "Login successful.",
                "userType": user_type,
            })
        else:
            return JsonResponse({"status": "error", "message": "Invalid credentials."}, status=401)
    
    return JsonResponse({"message": "Method not allowed"}, status=405)

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
        # TA data
        return JsonResponse({
            "status": "success",
            "user": {
                "name": user.name,
                "surname": user.surname,
                "email": user.email,
                "program": user.program,
                "advisor": user.advisor,
                "isTA": True,
            }
        })
    else:
        # Staff data
        return JsonResponse({
            "status": "success",
            "user": {
                "name": user.name,
                "surname": user.surname,
                "department": user.department,
                "email": user.email,
                "isTA": False,
            }
        })


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
    
    new_name = data.get("name")
    new_surname = data.get("surname")
    new_password = data.get("password")

    if new_name:
        user.name = new_name
    if new_surname:
        user.surname = new_surname
    if new_password:
        user.set_password(new_password)
    user.save()

    return JsonResponse({"status": "success", "message": "Profile updated successfully."})
