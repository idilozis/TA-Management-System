# myapp/taleave/views.py
import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from myapp.utils import advisor_department
import os
import mimetypes

from myapp.taleave.models import TALeaveRequests
from myapp.userauth.helpers import find_user_by_email
from myapp.notificationsystem.views import create_notification
from myapp.models import StaffUser, AuthorizedUser

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
    document = request.FILES.get("document")  # optional
    
    if not (leave_type and start_date_str and end_date_str and start_time_str and end_time_str and description):
        return JsonResponse({"status": "error", "message": "Missing required fields"}, status=400)
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        start_time = datetime.strptime(start_time_str, "%H:%M").time()
        end_time = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError:
        return JsonResponse({"status": "error", "message": "Invalid date/time format"}, status=400)
    
    if end_date < start_date or (end_date == start_date and end_time < start_time):
        return JsonResponse({"status":"error","message":"Invalid date/time range"}, status=400)
    
    # Create leave request
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

    # Notify department SECRETARY and all DEANS
    dept = advisor_department(user.advisor)
    if dept:
        secretary_role = f"{dept} SECRETARY"
        authorized_list = AuthorizedUser.objects.filter(
            Q(role=secretary_role) | Q(role="DEAN")
        )
    else:
        authorized_list = AuthorizedUser.objects.filter(role="DEAN")
    for auth in authorized_list:
        create_notification(
            recipient_email=auth.email,
            message=f"{user.name} {user.surname} created a leave request."
        )
        
    return JsonResponse({"status":"success","message":"Leave request created successfully.","leave_id": leave.id})

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
# LIST PENDING LEAVE REQUESTS (Authorized User side)
# -----------------------------
@require_GET
def list_pending_leaves(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if user_type != "Authorized" or not user.isAuth:
        return JsonResponse({"status": "error", "message": "Only authorized users can view pending leave requests"}, status=403)
    
    dept = user.role.split()[0] if user.role.endswith("SECRETARY") else None
    qs = TALeaveRequests.objects.filter(status="pending").order_by("-start_date")
    if dept:
        qs = [lv for lv in qs if advisor_department(lv.ta_user.advisor) == dept]
    
    data = []
    for leave in qs:
        total_days = (leave.end_date - leave.start_date).days + 1
        data.append({
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
    
    return JsonResponse({"status": "success", "leaves": data})


# -----------------------------
# LIST PAST LEAVE REQUESTS (Authorized User side)
# -----------------------------
@require_GET
def list_past_leaves(request):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if user_type != "Authorized" or not user.isAuth:
        return JsonResponse({"status": "error", "message": "Only authorized users can view past leave requests"}, status=403)
    
    dept = user.role.split()[0] if user.role.endswith("SECRETARY") else None
    qs = TALeaveRequests.objects.filter(status__in=["approved","rejected"]).order_by("-start_date")
    if dept:
        qs = [lv for lv in qs if advisor_department(lv.ta_user.advisor) == dept]
    
    data = []
    for leave in qs:
        total_days = (leave.end_date - leave.start_date).days + 1
        data.append({
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
    
    return JsonResponse({"status": "success", "leaves": data})


# -----------------------------
# UPDATE LEAVE REQUEST STATUS (Authorized User side)
# -----------------------------
@csrf_exempt
@require_POST
@transaction.atomic
def update_leave_status(request, leave_id):
    session_email = request.session.get("user_email")
    if not session_email:
        return JsonResponse({"status": "error", "message": "Not authenticated"}, status=401)
    
    user, user_type = find_user_by_email(session_email)
    if not user or user_type != "Authorized" or not getattr(user, 'isAuth', False):
        return JsonResponse({"status": "error", "message": "Only authorized users can update leave requests"}, status=403)
    
    try:
        leave = TALeaveRequests.objects.get(id=leave_id)
    except TALeaveRequests.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Leave request not found"}, status=404)
    
    if leave.status != "pending":
        return JsonResponse({"status": "error", "message": "Leave request status cannot be updated"}, status=400)
    
    data = json.loads(request.body)
    new_status = data.get("status")
    if new_status not in ["approved", "rejected"]:
        return JsonResponse({"status": "error", "message": "Invalid status"}, status=400)
    
    leave.status = new_status
    leave.save()

    # Notify the TA about the updated leave status
    create_notification(
        recipient_email=leave.ta_user.email,
        message=f"Your leave request has been {new_status}."
    )
    
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
    
    # Security check: Only allow the TA who owns the leave or authorized users to download
    is_owner = user_type == "TA" and leave.ta_user.email == user.email
    is_authorized = user_type == "Authorized" and getattr(user, 'isAuth', False)
    
    if not (is_owner or is_authorized):
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
