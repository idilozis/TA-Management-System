# myapp/taduties/models.py
from django.db import models
from myapp.models import TAUser, Course

DUTY_TYPES = [
    ("lab", "Lab"),
    ("grading", "Grading"),
    ("recitation", "Recitation"),
    ("office_hours", "Office Hours"),
    ("exam_proctoring", "Proctoring"),
    ("other", "Other"),
]

STATUS_CHOICES = [
    ("pending", "Pending"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
]

class TADuty(models.Model):
    ta_user = models.ForeignKey(
        TAUser,
        on_delete=models.CASCADE,
        related_name="duties"
    )
    
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Course related to the duty (optional)."
    )
    
    duty_type = models.CharField(
        max_length=20,
        choices=DUTY_TYPES,
        default="other",
        help_text="Type of duty performed."
    )
    
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    description = models.TextField(
        blank=True,
        help_text="Additional details or comments about the duty."
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status (pending, approved, or rejected)."
    )

    class Meta:
        db_table = "ta_duties"

    def __str__(self):
        return f"{self.ta_user.email} - {self.duty_type} ({self.status})"
