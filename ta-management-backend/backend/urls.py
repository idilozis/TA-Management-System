from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse

def initial_backend_view(request):
    _ = request
    return HttpResponse("This is the backend of the TA Management System.")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('list/', include('myapp.urls')),                   # Call "myapp" functions
    path('auth/', include('myapp.userauth.urls')),          # Call "myapp -> userauth" functions
    path('schedule/', include('myapp.schedule.urls')),      # Call "myapp -> schedule" functions
    path('proctoring/', include('myapp.proctoring.urls')),  # Call "myapp -> proctoring" functions
    path('taduties/', include('myapp.taduties.urls')),      # Call "myapp -> taduties" functions

    # Default root view
    path('', initial_backend_view), 
]
