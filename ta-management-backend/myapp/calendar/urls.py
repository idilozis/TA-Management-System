# myapp/calendar/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path("events/", ta_calendar_events, name="ta_calendar_events"),
]