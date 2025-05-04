# myapp/calendar/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from datetime import datetime

from myapp.taduties.models import TADuty
from myapp.proctoring.models import ProctoringAssignment
from myapp.taleave.models import TALeaveRequests
from myapp.userauth.helpers import find_user_by_email

@require_GET
def ta_calendar_events(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can view calendar"}, status=403)

    events = []

    # Proctoring assignments
    for p in ProctoringAssignment.objects.filter(ta=user):
        # p.exam or p.dean_exam
        exam = p.exam or p.dean_exam
        date = exam.date
        start = exam.start_time
        end   = exam.end_time
        events.append({
            "title": f"Proctoring: {exam.course.code if hasattr(exam, 'course') else exam}", 
            "start": f"{date}T{start}",
            "end":   f"{date}T{end}",
            "color": "#f87171",
            "extendedProps": {"type": "proctoring"}
        })

    # TA duty logs (approved)
    for d in TADuty.objects.filter(ta_user=user, status="approved"):
        start_dt = datetime.combine(d.date, d.start_time)
        end_dt   = datetime.combine(d.date, d.end_time)
        duration = (end_dt - start_dt).total_seconds()/3600
        duty_label = d.get_duty_type_display()
        course_code = d.course and d.course.code or ""
        events.append({
            "title": f"{duty_label}: {course_code}",
            "start": f"{d.date}T{d.start_time}",
            "end":   f"{d.date}T{d.end_time}",
            "extendedProps": {
                "type":"duty",
                "duration": duration
            }
        })

    # Approved leave requests
    for l in TALeaveRequests.objects.filter(ta_user=user, status="approved"):
        # Combine date + time for precise start/end
        start_ts = f"{l.start_date}T{l.start_time}"
        end_ts   = f"{l.end_date}T{l.end_time}"
        events.append({
            "title": f"Leave: {l.get_leave_type_display()}",
            "start": start_ts,
            "end":   end_ts,
            "color": "#60a5fa",
            "extendedProps": {"type": "leave"}
        })

    return JsonResponse({"status": "success", "events": events})
