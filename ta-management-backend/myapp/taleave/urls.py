from django.urls import path
from .views import *

# Call with taleave/... (Look at backend > urls.py)
urlpatterns = [
    path("create-leave/", create_leave, name="create_leave"),
    path("my-leaves/", list_my_leaves, name="list_my_leaves"),
    path("pending-leaves/", list_pending_leaves, name="list_pending_leaves"),
    path("past-leaves/", list_past_leaves, name="list_past_leaves"),
    path("leaves/<int:leave_id>/update-status/", update_leave_status, name="update_leave_status"),
    path("leaves/<int:leave_id>/download-document/", download_document, name="download_document"),
]
