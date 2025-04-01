# myapp/taleave/models.py
from django.db import models 
from myapp.models import TAUser

# ENUMs
LEAVE_TYPES = [
    ("medical", "Medical"),
    ("conference", "Conference"),
    ("vacation", "Vacation"),
    ("other", "Other"),
]

LEAVE_STATUS = [
    ("pending", "Pending"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
]

class TALeaveRequests(models.Model):
    ta_user = models.ForeignKey(
        TAUser,
        on_delete=models.CASCADE,
        related_name="leaves"
    )

    leave_type = models.CharField(
        max_length=20,
        choices=LEAVE_TYPES,
        default="other"
    )

    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    description = models.TextField()  # required
    document = models.FileField(upload_to="ta_leaves/", blank=True, null=True)
    
    status = models.CharField(
        max_length=20,
        choices=LEAVE_STATUS,
        default="pending"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "ta_leaves"
    
    def __str__(self):
        return f"{self.ta_user.email} - {self.get_leave_type_display()} ({self.get_status_display()})"
