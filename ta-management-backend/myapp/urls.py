# myapp/urls.py
from django.urls import path
from myapp.views import *

# Call with list/... (Look at backend > urls.py)
urlpatterns = [
    path("courses/", list_courses, name="list_courses"),
    path("mail-users/", list_users_by_role, name="list_users_by_role"),
    path("mail-sender/", send_mail_to_user, name="send_mail_to_user"),
]
