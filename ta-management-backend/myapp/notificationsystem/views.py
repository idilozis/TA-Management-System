# myapp/notificationsystem/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from myapp.userauth.helpers import find_user_by_email
from .models import Notification

@require_GET
def list_notifications(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    # Return only UNREAD notifications
    notifications = Notification.objects.filter(
        recipient_email=user.email,
        is_read=False
    ).order_by("-created_at")

    notif_list = []
    for n in notifications:
        notif_list.append({
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        })

    return JsonResponse({
        "status": "success",
        "notifications": notif_list
    })


@require_GET
def notification_count(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    # Only unread notifications
    count = Notification.objects.filter(
        recipient_email=user.email,
        is_read=False
    ).count()

    return JsonResponse({"status": "success", "count": count})


@csrf_exempt
@require_POST
@transaction.atomic
def mark_notification_as_read(request, notification_id):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    try:
        notif = Notification.objects.get(id=notification_id, recipient_email=user.email)
    except Notification.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Notification not found"}, status=404)

    if notif.is_read:
        return JsonResponse({"status": "success", "message": "Already read"})

    notif.is_read = True
    notif.save()

    return JsonResponse({"status": "success", "message": "Notification marked as read"})


@csrf_exempt
@require_POST
@transaction.atomic
def mark_all_as_read(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)

    user, user_type = find_user_by_email(session_email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)

    Notification.objects.filter(
        recipient_email=user.email,
        is_read=False
    ).update(is_read=True)

    return JsonResponse({"status": "success", "message": "All notifications marked as read."})


def create_notification(recipient_email, message):
    return Notification.objects.create(recipient_email=recipient_email, message=message)
