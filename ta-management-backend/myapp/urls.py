# myapp/urls.py
from django.urls import path
from myapp.views import *

# Call with list/... (Look at backend > urls.py)
urlpatterns = [
    path("courses/", list_courses, name="list_courses")
]