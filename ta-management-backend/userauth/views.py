from django.http import JsonResponse
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
import json
from django.conf import settings

# LOGIN
@csrf_exempt # because, for now, it doesn't require any tokens
def login_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        # Hardcoded credentials for testing: ynsgunayy@gmail.com & 123456
        if email == "ynsgunayy@gmail.com" and password == "123456":
            return JsonResponse({"message": "Login successful!", "status": "success"}, status=200)
        else:
            return JsonResponse({"message": "Invalid credentials.", "status": "error"}, status=401)

    return JsonResponse({"message": "Method not allowed"}, status=405)


# FORGOT PASSWORD
@csrf_exempt
def forgot_password_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")

        # Simulated database lookup (Replace with real MySQL DB check)
        if email == "ynsgunayy@gmail.com":
            reset_link = f"http://localhost:3000/auth/reset-password?email={email}"
            
            # Password reset email
            try:
                send_mail(
                    subject="Password Reset Request",
                    message=f"Click here to reset your password: {reset_link}",
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return JsonResponse({"message": "Password reset link sent! Check your email."}, status=200)
            except Exception as e:
                return JsonResponse({"message": "Email sending failed.", "error": str(e)}, status=500)
        
        return JsonResponse({"message": "Email not found."}, status=404)

    return JsonResponse({"message": "Method not allowed"}, status=405)


# RESET PASSWORD
@csrf_exempt
def reset_password_view(request):
    if request.method == "POST":
        data = json.loads(request.body)
        email = data.get("email")
        new_password = data.get("password")

        # Simulated database lookup (Replace with real MySQL DB logic)
        if email == "ynsgunayy@gmail.com":
            # TODO: Update password in the database here

            # Send a success confirmation email
            try:
                login_link = "http://localhost:3000/" # Redirect to the login page
                send_mail(
                    subject="Password Successfully Reset",
                    message=f"Your password has been successfully reset. You can now log in using your new password.\n\nClick here to login: {login_link}",
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[email],
                    fail_silently=False,
                )
                return JsonResponse({
                    "message": "Password reset successful! A confirmation email has been sent.",
                    "redirect_url": login_link
                }, status=200)
            except Exception as e:
                return JsonResponse({"message": "Password reset successful, but email sending failed.", "error": str(e)}, status=500)

        return JsonResponse({"message": "Invalid email."}, status=400)

    return JsonResponse({"message": "Method not allowed"}, status=405)

