# myapp/proctoring/models.py
from django.db import models
from django.core.exceptions import ValidationError
from myapp.models import TAUser
from myapp.exams.models import Exam, DeanExam

class ProctoringAssignment(models.Model):
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.CASCADE, related_name="proctoring_assignments")
    dean_exam = models.ForeignKey(DeanExam, null=True, blank=True, on_delete=models.CASCADE, related_name="proctoring_assignments")
    ta = models.ForeignKey(TAUser, on_delete=models.CASCADE, related_name='proctored_assignments')

    class Meta:
        db_table = "proctoring"

    def clean(self):
        # Enforce exactly one of exam or dean_exam
        if bool(self.exam) == bool(self.dean_exam):
            raise ValidationError("Must set exactly one of `exam` or `dean_exam`.")

    def __str__(self):
        target = self.exam or self.dean_exam
        return f"{target} — {self.ta.email}"
