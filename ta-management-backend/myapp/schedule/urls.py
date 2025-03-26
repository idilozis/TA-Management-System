from django.urls import path
from .views import *

# Call with schedule/... (Look at backend > urls.py)
urlpatterns = [
    path('list-weekly/', list_weekly_slots, name='list_weekly_slots'),  # schedule/list-weekly
    path('update-weekly/', update_weekly_slot, name='update_weekly_slot'),  # schedule/update-weekly
    path('delete-weekly/', delete_weekly_slot, name='delete_weekly_slot'),  # schedule/delete-weekly
]
