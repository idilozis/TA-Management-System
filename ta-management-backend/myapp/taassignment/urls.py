# myapp/taassignment/urls.py
from django.urls import path
from .views import *

# Call with assignment/... (Look at backend > urls.py)
urlpatterns = [
    path('list-assignments/', list_assignment_preferences, name='assignment_list'),
]
