# myapp/taassignment/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('get/', views.get_assignments, name='get_assignments'),
    path('update/', views.update_assignment, name='update_assignment'),
]
