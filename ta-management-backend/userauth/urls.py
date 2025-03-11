from django.urls import path
from .views import * # this will import everything in userauth.views

urlpatterns = [
    path('login/', login_view, name="login"),
    path('forgot-password/', forgot_password_view, name="forgot-password"),
    path('reset-password/', reset_password_view, name="reset-password"),
]
