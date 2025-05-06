from django.urls import path
from .views import *

# Call with exams/... (Look at backend > urls.py)
urlpatterns = [
    # staff‐owned exams
    path('create-exam/', create_exam, name='create_exam'),
    path('list-courses/', list_staff_courses, name='list_staff_courses'),
    path('list-exams/', list_staff_exams, name='list_staff_exams'),
    path('list-ta-exams/', list_ta_exams, name='list_ta_exams'),
    path('delete-exam/', delete_exam, name='delete_exam'),
    path("list-classrooms/", list_classrooms, name="list_classrooms"),
    path('update-exam/', update_exam, name='update_exam'),
    path('update-dean-exam/', update_dean_exam, name='update_dean_exam'),

    # dean/authorized
    path("list-dean-courses/", list_dean_courses, name="list_dean_courses"),
    path("create-dean-exam/", create_dean_exam, name="create_dean_exam"),
    path("list-dean-exams/", list_dean_exams, name="list_dean_exams"),
    path("delete-dean-exam/", delete_dean_exam, name="delete_dean_exam"),
]
