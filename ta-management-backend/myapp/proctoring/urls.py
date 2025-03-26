from django.urls import path
from .views import *

# Call with proctoring/... (Look at backend > urls.py)
urlpatterns = [
    path('create-exam/', create_exam, name='create_exam'), # proctoring/create-exam/
    path('list-courses/', list_staff_courses, name='list_staff_courses'), # proctoring/list-courses/

    path('list-exams/', list_staff_exams, name='list_staff_exams'), # proctoring/list-exams/
    path('delete-exam/', delete_exam, name='delete_exam'), # proctoring/delete-exam 
]
