from django.urls import path
from myapp.proctoring.views import *

# Call with proctoring/... (Look at backend > urls.py)
urlpatterns = [
    # Staff (Instructors)
    path('automatic-assignment/<int:exam_id>/', automatic_proctor_assignment, name='automatic_proctoring_assignment'),
    path('confirm-assignment/<int:exam_id>/', confirm_assignment, name="confirm_assignment"),
    path('candidate-tas/<int:exam_id>/', candidate_tas, name='candidate_tas'),
    
    # Dean
    path("automatic-dean-assignment/<int:exam_id>/", automatic_dean_assignment, name='automatic_dean_assignment'),
    path("confirm-dean-assignment/<int:exam_id>/", confirm_dean_assignment, name="confirm_dean_assignment"),
    path("candidate-tas-dean/<int:exam_id>/", candidate_tas_dean, name='candidate_tas_dean'),

    # Common
    path('ta-details/', ta_details, name='ta_details'),
]
