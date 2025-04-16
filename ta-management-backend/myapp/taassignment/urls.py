# myapp/taassignment/urls.py
from django.urls import path
from .views import *

# Call with assignment/... (Look at backend > urls.py)
urlpatterns = [
    path('list-preferences/', list_assignment_preferences, name='list_preferences'),
    path('assign-tas/', assign_tas, name='assign_tas'),
    path('assign-graders/', assign_graders, name='assign_graders'),
]
