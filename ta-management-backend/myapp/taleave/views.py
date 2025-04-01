# myapp/taleave/views.py
import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
import os
import mimetypes

from myapp.taleave.models import TALeaveRequests
from myapp.userauth.helpers import find_user_by_email

# -----------------------------
# CREATE LEAVE REQUEST (TA side)
# -----------------------------
@csrf_exempt
@require_POST
@transaction.atomic
def create_leave(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can request leaves"}, status=403)
    
    # Use POST and FILES (multipart/form-data)
    leave_type = request.POST.get("leave_type")
    start_date_str = request.POST.get("start_date")
    end_date_str = request.POST.get("end_date")
    start_time_str = request.POST.get("start_time")
    end_time_str = request.POST.get("end_time")
    description = request.POST.get("description")  # required
    
    if not (leave_type and start_date_str and end_date_str and start_time_str and end_time_str and description):
        return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)
    
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        start_time = datetime.strptime(start_time_str, "%H:%M").time()
        end_time = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format"}, status=400)
    
    if end_date < start_date:
        return JsonResponse({"status": "error", "message": "End date cannot be before start date"}, status=400)
    # If same day, end time must be later than start time.
    if end_date == start_date and end_time < start_time:
        return JsonResponse({"status": "error", "message": "End time cannot be before start time"}, status=400)
    
    document = request.FILES.get("document")
    
    leave = TALeaveRequests.objects.create(
        ta_user=user,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        description=description,
        document=document,
        status="pending"
    )
    
    return JsonResponse({
        "status": "success",
        "message": "Leave request created successfully.",
        "leave_id": leave.id
    })


# -----------------------------
# LIST MY LEAVE REQUESTS (TA side)
# -----------------------------
@require_GET
def list_my_leaves(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "TA":
        return JsonResponse({"status": "error", "message": "Only TAs can view their leave requests"}, status=403)
    
    leaves = TALeaveRequests.objects.filter(ta_user=user).order_by("-start_date")
    leave_list = []
    for leave in leaves:
        leave_list.append({
            "id": leave.id,
            "leave_type": leave.get_leave_type_display(),
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "start_time": leave.start_time.strftime("%H:%M"),
            "end_time": leave.end_time.strftime("%H:%M"),
            "description": leave.description,
            "status": leave.get_status_display(),
            "created_at": leave.created_at.isoformat(),
            "document_url": leave.document.url if leave.document else None,
        })
    return JsonResponse({"status": "success", "leaves": leave_list})


# -----------------------------
# LIST PENDING LEAVE REQUESTS (Staff/Advisor side)
# -----------------------------
@require_GET
def list_pending_leaves(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    # Only staff/advisors can view leave requests
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can view leave requests"}, status=403)
    
    # Filter pending leaves where TA's advisor matches current staff user's full name (case-insensitive)
    pending_leaves = TALeaveRequests.objects.filter(
        status="pending",
        ta_user__advisor__iexact=f"{user.name} {user.surname}"
    ).order_by("-start_date")
    
    def compute_total_days(start_date, end_date):
        return (end_date - start_date).days + 1

    leave_list = []
    for leave in pending_leaves:
        total_days = compute_total_days(leave.start_date, leave.end_date)
        leave_list.append({
            "id": leave.id,
            "ta_email": leave.ta_user.email,
            "ta_name": f"{leave.ta_user.name} {leave.ta_user.surname}",
            "leave_type": leave.get_leave_type_display(),
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "start_time": leave.start_time.strftime("%H:%M"),
            "end_time": leave.end_time.strftime("%H:%M"),
            "description": leave.description,
            "status": leave.get_status_display(),
            "total_days": total_days,
            "created_at": leave.created_at.isoformat(),
            "document_url": leave.document.url if leave.document else None,
        })
    
    return JsonResponse({"status": "success", "leaves": leave_list})


# -----------------------------
# LIST PAST LEAVE REQUESTS (Staff/Advisor side)
# -----------------------------
@require_GET
def list_past_leaves(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can view past leave requests"}, status=403)
    
    past_leaves_qs = TALeaveRequests.objects.filter(
        status__in=["approved", "rejected"],
        ta_user__advisor__iexact=f"{user.name} {user.surname}"
    ).order_by("-start_date")
    
    def compute_total_days(start_date, end_date):
        return (end_date - start_date).days + 1

    leave_list = []
    for leave in past_leaves_qs:
        total_days = compute_total_days(leave.start_date, leave.end_date)
        leave_list.append({
            "id": leave.id,
            "ta_email": leave.ta_user.email,
            "ta_name": f"{leave.ta_user.name} {leave.ta_user.surname}",
            "leave_type": leave.get_leave_type_display(),
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "start_time": leave.start_time.strftime("%H:%M"),
            "end_time": leave.end_time.strftime("%H:%M"),
            "description": leave.description,
            "status": leave.get_status_display(),
            "total_days": total_days,
            "created_at": leave.created_at.isoformat(),
            "document_url": leave.document.url if leave.document else None,
        })
    
    return JsonResponse({"status": "success", "leaves": leave_list})


# -----------------------------
# UPDATE LEAVE REQUEST STATUS (Staff/Advisor side)
# -----------------------------
@csrf_exempt
@require_POST
@transaction.atomic
def update_leave_status(request, leave_id):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type == "TA":
        return JsonResponse({"status": "error", "message": "Only staff can update leave requests"}, status=403)
    
    try:
        leave = TALeaveRequests.objects.get(id=leave_id)
    except TALeaveRequests.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Leave request not found"}, status=404)
    
    if leave.status != "pending":
        return JsonResponse({"status": "error", "message": "Leave request status cannot be updated"}, status=400)
    
    # Verify that the current staff user is the advisor for the TA (comparing full names, case-insensitive)
    if leave.ta_user.advisor.strip().lower() != f"{user.name} {user.surname}".strip().lower():
        return JsonResponse({"status": "error", "message": "You are not authorized to update this leave request"}, status=403)
    
    data = json.loads(request.body)
    new_status = data.get("status")
    if new_status not in ["approved", "rejected"]:
        return JsonResponse({"status": "error", "message": "Invalid status"}, status=400)
    
    leave.status = new_status
    leave.save()
    
    return JsonResponse({"status": "success", "message": f"Leave request {new_status}."})


# -----------------------------
# DOWNLOAD DOCUMENT
# -----------------------------
def download_document(request, leave_id):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user:
        return JsonResponse({"status": "error", "message": "User not found"}, status=404)
    
    try:
        leave = TALeaveRequests.objects.get(id=leave_id)
    except TALeaveRequests.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Leave request not found"}, status=404)
    
    # Security check: Only allow the TA who owns the leave or their advisor to download
    is_owner = user_type == "TA" and leave.ta_user.email == user.email
    is_advisor = user_type != "TA" and leave.ta_user.advisor.strip().lower() == f"{user.name} {user.surname}".strip().lower()
    
    if not (is_owner or is_advisor):
        return JsonResponse({"status": "error", "message": "You don't have permission to download this file"}, status=403)
    
    if not leave.document:
        return JsonResponse({"status": "error", "message": "No document attached to this leave request"}, status=404)
    
    file_path = leave.document.path
    filename = os.path.basename(file_path)
    
    # Get file mime type
    content_type, encoding = mimetypes.guess_type(file_path)
    if content_type is None:
        content_type = 'application/octet-stream'
    
    # Open the file in binary mode
    try:
        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except FileNotFoundError:
        return JsonResponse({"status": "error", "message": "File not found on server"}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Error serving file: {str(e)}"}, status=500)
