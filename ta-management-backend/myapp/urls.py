# myapp/urls.py
from django.urls import path
from myapp.views import *

# Call with list/... (Look at backend > urls.py)
urlpatterns = [
    path("mail-users/", list_users_by_role, name="list_users_by_role"),
    path("mail-sender/", send_mail_to_user, name="send_mail_to_user"),

    path("tas/", list_all_tas, name="list_all_tas"),
    path("staff/", list_all_staff, name="list_all_staff"),
    path("courses/", list_all_courses, name="list_all_courses"),
    
    path("global-settings/", global_settings, name="global-settings"),
    
    path("create/ta/", create_ta, name="create_ta"),
    path("create/staff/", create_staff, name="create_staff"),
    path("create/course/", create_course, name="create_course"),
]
