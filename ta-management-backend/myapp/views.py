# myapp/views.py
# This file is not in use currently.

from django.http import JsonResponse
def home_view(request):
    _ = request
    return JsonResponse({"message": "Welcome to TA Management System!"})
