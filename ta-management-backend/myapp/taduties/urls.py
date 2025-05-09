# myapp/taduties/urls.py
from django.urls import path
from .views import *

# Call with taduties/... (Look at backend > urls.py)
urlpatterns = [
    path("create-duty/", create_duty, name="create_duty"),
    path("my-duties/", list_my_duties, name="list_my_duties"),
    path("pending-requests/", list_pending_duties, name="list_pending_duties"),
    path("past-requests/", list_past_requests, name="list_past_duties"),
    path("<int:duty_id>/update-status/", update_duty_status, name="update_duty_status"),
    path('update-duty/<int:duty_id>/', update_duty, name='update_duty'),
]
