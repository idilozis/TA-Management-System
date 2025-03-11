from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def initial_backend_view(request):
    return HttpResponse("This is the backend of the TA Management System.")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('userauth.urls')),  # includes "auth.urls" file. for frontend, call with "auth/"

    # Default root view
    path('', initial_backend_view), 
]
