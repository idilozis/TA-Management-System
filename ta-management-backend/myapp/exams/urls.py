from django.urls import path
from .views import *

# Call with exams/... (Look at backend > urls.py)
urlpatterns = [
    path('create-exam/', create_exam, name='create_exam'), # exams/create-exam/
    path('list-courses/', list_staff_courses, name='list_staff_courses'), # exams/list-courses/
    path('list-exams/', list_staff_exams, name='list_staff_exams'), # exams/list-exams/
    path('list-ta-exams/', list_ta_exams, name='list_ta_exams'), # exams/list-ta-exams/
    path('delete-exam/', delete_exam, name='delete_exam'), # exams/delete-exam 
]
