from django.urls import path
from myapp.proctoring.views import *

# Call with proctoring/... (Look at backend > urls.py)
urlpatterns = [
    path('automatic-assignment/<int:exam_id>/', automatic_proctor_assignment, name='automatic_proctoring_assignment'),
    path('confirm-assignment/<int:exam_id>/', confirm_assignment, name="confirm_assignment")
]
