# myapp/taassignment/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import ensure_csrf_cookie
from myapp.taassignment.models import TAAssignment

@require_GET
@ensure_csrf_cookie
def list_assignment_preferences(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    assignments = TAAssignment.objects.all().select_related("staff", "course") \
        .prefetch_related("must_have_ta", "preferred_tas", "preferred_graders", "avoided_tas")
    data = []
    for assignment in assignments:
        data.append({
            "staff": {
                "name": assignment.staff.name,
                "surname": assignment.staff.surname,
                "email": assignment.staff.email,
            },
            "course": {
                "code": assignment.course.code,
                "name": assignment.course.name,
            },
            "min_load": assignment.min_load,
            "max_load": assignment.max_load,
            "num_graders": assignment.num_graders,
            "must_have_ta": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.must_have_ta.all()
            ],
            "preferred_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.preferred_tas.all()
            ],
            "preferred_graders": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.preferred_graders.all()
            ],
            "avoided_tas": [
                {"name": ta.name, "surname": ta.surname, "email": ta.email}
                for ta in assignment.avoided_tas.all()
            ],
        })
    return JsonResponse({"status": "success", "assignments": data})
