# myapp/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from myapp.models import Course

"""
This file will essentially be used for frontend's "Tables" page.
"""

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
