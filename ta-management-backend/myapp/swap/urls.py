from django.urls import path
from .views import *

urlpatterns = [
    path("request/",        create_swap,          name="create_swap"),
    path("respond/<int:swap_id>/", respond_swap,  name="respond_swap"),
    path("my/",             list_my_swaps,        name="list_my_swaps"),
    path("candidates/<int:assignment_id>/", swap_candidates, name="swap_candidates"),
]
