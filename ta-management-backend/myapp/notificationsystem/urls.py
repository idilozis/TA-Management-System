from django.urls import path
from myapp.notificationsystem.views import *

# Call with notifications/... (Look at backend > urls.py)
urlpatterns = [
    path("list/", list_notifications, name="list_notifications"),
    path("count/", notification_count, name="notification_count"),
    path("mark-read/<int:notification_id>/", mark_notification_as_read, name="mark_notification_as_read"),
    path("mark-all-read/", mark_all_as_read, name="mark_all_as_read"),
]
