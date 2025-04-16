# myapp/reports/urls.py
from django.urls import path
from .views import *

urlpatterns = [
    path('download-total-proctoring-sheet/', download_total_proctoring_sheet, name='download_total_proctoring_sheet'),
    path('download-total-ta-duty-sheet/', download_total_ta_duty_sheet, name='download_total_ta_duty_sheet'),
    path('download-total-workload-sheet/', download_total_workload_sheet, name='download_workload_sheet'),
]
