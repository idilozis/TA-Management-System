# myapp/urls.py
from django.urls import path
from myapp.views import *

urlpatterns = [
    path("courses/", list_courses, name="list_courses")
]