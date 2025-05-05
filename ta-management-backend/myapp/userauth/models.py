# myapp/userauth/models.py
from django.db import models

class AuthLog(models.Model):
    LOGIN  = 'login'
    LOGOUT = 'logout'
    ACTION_CHOICES = [
        (LOGIN, 'Login'),
        (LOGOUT, 'Logout'),
    ]

    user_email = models.EmailField(
        default="", 
        help_text="Email of the user who logged in/out"
    )
    user_type = models.CharField(
        max_length=20,
        choices=[('TA','TA'),('Staff','Staff'),('Authorized','Authorized')],
        default="TA",
        help_text="Type of user (TA, Staff, Authorized)"
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    timestamp  = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "system_logs"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.user_email} {self.action} @ {self.timestamp}"
