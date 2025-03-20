# myapp/schedule/models.py
from django.db import models
from myapp.models import TAUser  # TAUser is defined in myapp/models.py

class TAWeeklySlot(models.Model):
    # ENUM
    DAYS_OF_WEEK = [
        ('MON', 'Monday'),
        ('TUE', 'Tuesday'),
        ('WED', 'Wednesday'),
        ('THU', 'Thursday'),
        ('FRI', 'Friday'),
        ('SAT', 'Saturday'),
        ('SUN', 'Sunday'),
    ]

    ta = models.ForeignKey(TAUser, on_delete=models.CASCADE, related_name='weekly_slots')
    day = models.CharField(max_length=3, choices=DAYS_OF_WEEK)
    time_slot = models.CharField(max_length=20)  # e.g. "08:30-09:20"
    course = models.CharField(max_length=50, blank=True, null=True)  # e.g. "CS101"

    def __str__(self):
        return f"{self.ta.email} - {self.day} {self.time_slot} -> {self.course or 'None'}"
