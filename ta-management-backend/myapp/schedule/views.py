# myapp/schedule/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.db import transaction
import json

from myapp.userauth.helpers import find_user_by_email
from myapp.schedule.models import TAWeeklySlot


# -----------------------------
# LIST WEEKLY SCHEDULE
# -----------------------------
@require_GET
def list_weekly_slots(request):
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or not user.isTA:
        return JsonResponse({"status": "error", "message": "Staff cannot see schedule."}, status=403)

    slots = TAWeeklySlot.objects.filter(ta=user).order_by('day', 'time_slot')
    data = []
    for slot in slots:
        data.append({
            "id": slot.id,
            "day": slot.day,
            "time_slot": slot.time_slot,
            "course": slot.course or ""
        })
    return JsonResponse({"status": "success", "slots": data})


# -----------------------------
# ADD COURSE
# -----------------------------
@require_POST
@transaction.atomic
def update_weekly_slot(request):
    data = json.loads(request.body)
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or not user.isTA:
        return JsonResponse({"status": "error", "message": "Only TAs can update schedule."}, status=403)

    day = data.get("day")
    time_slot = data.get("time_slot")
    course = data.get("course", "")

    if not (day and time_slot):
        return JsonResponse({"status": "error", "message": "Missing day or time_slot"}, status=400)

    # Upsert a slot row for (user, day, time_slot)
    slot, created = TAWeeklySlot.objects.get_or_create(ta=user, day=day, time_slot=time_slot)
    slot.course = course
    slot.save()

    # Return the slot ID along with the success message
    return JsonResponse({
        "status": "success",
        "message": "Slot updated successfully.",
        "slot_id": slot.id
    })



# -----------------------------
# DELETE COURSE
# -----------------------------
@require_POST
@transaction.atomic
def delete_weekly_slot(request):
    data = json.loads(request.body)
    email = request.session.get("user_email")
    if not email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(email)
    if not user or not user.isTA:
        return JsonResponse({"status": "error", "message": "Only TAs can update schedule."}, status=403)

    # Get day and time_slot from request
    slot_id = data.get("id")
    day = data.get("day")
    time_slot = data.get("time_slot")

    if not (day and time_slot):
        return JsonResponse({"status": "error", "message": "Missing day or time_slot"}, status=400)

    try:
        # Delete the specified slot
        if slot_id:
            # If we have an ID, use it
            slot = TAWeeklySlot.objects.get(id=slot_id, ta=user)
            slot.delete()
        else:
            # Otherwise use day and time_slot
            slot = TAWeeklySlot.objects.get(ta=user, day=day, time_slot=time_slot)
            slot.delete()
            
        return JsonResponse({"status": "success", "message": "Slot deleted successfully."})
    except TAWeeklySlot.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Slot not found."}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)