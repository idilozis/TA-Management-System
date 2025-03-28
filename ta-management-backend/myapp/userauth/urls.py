from django.urls import path
from .views import *

# Call with auth/... (Look at backend > urls.py)
urlpatterns = [
    path('login/', login, name='login'), # auth/login/
    path('csrf/', get_csrf_token, name='get_csrf_token'), # auth/csrf/
    path('whoami/', get_current_user, name='whoami'), # auth/whoami/
    
    path('forgot-password/', forgot_password, name='forgot_password'), # auth/forgot-password/
    path('reset-password/', reset_password, name='reset_password'), # auth/reset-password/
    path("verify-password/", verify_password, name="verify_password"),
    path("get-current-user/", get_current_user, name="get_current_user"),
    path('update-profile/', update_profile, name='update_profile') # auth/update-profile/
]
