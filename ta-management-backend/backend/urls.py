from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def initial_backend_view(request):
    _ = request
    return HttpResponse("This is the backend of the TA Management System.")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('myapp.userauth.urls')),          # Call "myapp -> userauth" functions
    path('ta-duties/', include('myapp.ta-duties.urls')),    # Call "myapp -> ta-duties" functions

    # Default root view
    path('', initial_backend_view), 
]
