# myapp/notificationsystem/models.py
from django.db import models
from myapp.models import TAUser, StaffUser

class Notification(models.Model):
    recipient_email = models.EmailField()
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ("-created_at",)
    
    def __str__(self):
        return f"To: {self.recipient_email} | {self.message[:40]}"
