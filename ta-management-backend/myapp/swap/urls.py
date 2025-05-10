# myapp/swap/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path("request/", create_swap, name="swap_create"),
    path("respond/<int:swap_id>/", respond_swap, name="swap_respond"),
    path("my/", list_my_swaps, name="swap_my"),
    path("candidates/<int:assignment_id>/", swap_candidates, name="swap_candidates"),
    
    path("all/", list_all_assignments, name="swap_assignments_all"),
    path("candidates-staff/<int:assignment_id>/", candidate_tas_staff, name="swap_candidates_staff"),
    path("staff-swap/<int:assignment_id>/", staff_swap, name="staff_swap"),

    path("admin-history/", list_all_swaps, name="swap_admin_history"),
    path("history/<int:assignment_id>/", swap_assignment_history, name="swap_assignment_history"),
]
