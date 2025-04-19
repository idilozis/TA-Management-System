from django.urls import path
from .views import *

# Call with charts/... (Look at backend > urls.py)
urlpatterns = [
    path('ta-workload-data/', ta_workload_data, name='ta_workload_data'),
    path('department-comparison/', department_comparison_data, name='department_comparison'),
]
