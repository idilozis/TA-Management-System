# myapp/exams/models.py
from django.db import models 
from myapp.models import StaffUser
from myapp.models import Course

class Exam(models.Model): 
    instructor = models.ForeignKey(
        StaffUser,
        on_delete=models.CASCADE,
        related_name="exams_created"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="exams"
    )

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    num_proctors = models.PositiveIntegerField(default=1)
    classroom_name = models.CharField(max_length=255)
    student_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.course.code} exam on {self.date} in {self.classroom_name}"