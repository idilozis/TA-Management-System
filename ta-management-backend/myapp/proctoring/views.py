# myapp/proctoring/views.py
from django.http import JsonResponse
from myapp.exams.models import Exam
from myapp.proctoring.models import ProctoringAssignment
from myapp.proctoring.restrictions import ProctoringAssignmentSolver
from myapp.models import TAUser
from datetime import datetime
from django.views.decorators.http import require_http_methods
import json

@require_http_methods(["POST"])
def automatic_proctor_assignment(request, exam_id):
    """
    Automatic assignment endpoint.
    Returns candidate TA emails without writing to the database.
    """
    exam = Exam.objects.get(id=exam_id)
    solver = ProctoringAssignmentSolver(exam)
    assigned_tas, override_info = solver.assign_with_overrides()

    if len(assigned_tas) < exam.num_proctors:
        return JsonResponse({
            "success": False,
            "message": "Not enough TAs found, even after all overrides.",
            "override_info": override_info
        })

    return JsonResponse({
        "success": True,
        "assigned_tas": [ta.email for ta in assigned_tas],
        "override_info": override_info,
    })

@require_http_methods(["POST"])
def confirm_assignment(request, exam_id):
    """
    Confirm assignment endpoint.
    Called when the user accepts the assignment.
    This endpoint creates the ProctoringAssignment records and updates TA workloads.
    """
    exam = Exam.objects.get(id=exam_id)
    data = json.loads(request.body)
    assigned_tas = data.get("assigned_tas", [])

    if not assigned_tas:
        return JsonResponse({
            "success": False,
            "message": "No TAs provided to confirm assignment."
        })

    duration_hours = (datetime.combine(exam.date, exam.end_time) - datetime.combine(exam.date, exam.start_time)).seconds // 3600

    for ta_email in assigned_tas:
        ta = TAUser.objects.get(email=ta_email)
        ProctoringAssignment.objects.create(exam=exam, ta=ta)
        ta.workload += duration_hours
        ta.save()

    return JsonResponse({
        "success": True,
        "message": "Assignment confirmed and saved to the database."
    })
