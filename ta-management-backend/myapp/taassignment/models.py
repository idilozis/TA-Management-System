from django.db import models
from myapp.models import TAUser, StaffUser, Course

class CourseSection(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    section = models.PositiveIntegerField()
    instructor = models.ForeignKey(StaffUser, on_delete=models.CASCADE)
    min_tas = models.PositiveIntegerField(default=1)
    max_tas = models.PositiveIntegerField(default=0)
    student_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('course', 'section')

class TASectionAssignment(models.Model):
    section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='assignments')
    ta = models.ForeignKey(TAUser, on_delete=models.CASCADE)
    assignment_type = models.CharField(max_length=30)  # e.g., load_1, to_avoid, etc.
    load = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('section', 'ta')
