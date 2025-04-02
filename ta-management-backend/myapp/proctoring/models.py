# myapp/proctoring/models.py
from django.db import models
from myapp.models import TAUser
from myapp.exams.models import Exam

class ProctoringAssignment(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='proctoringassignment')
    ta = models.ForeignKey(TAUser, on_delete=models.CASCADE, related_name='proctored_exams')

    class Meta:
        db_table = "proctoring"

    def __str__(self):
        return f"{self.exam} - {self.ta.email}"
