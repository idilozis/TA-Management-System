# myapp/exams/models.py
from django.db import models
from django.core.exceptions import ValidationError
from myapp.models import StaffUser, AuthorizedUser, Course
from myapp.exams.classrooms import ClassroomEnum
from myapp.exams.courses_nondept import NonDeptCourseEnum

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
    student_count = models.PositiveIntegerField(default=0)

    classrooms = models.JSONField(
        default=list,
        help_text="List of room codes from ClassroomEnum"
    )

    def clean(self):
        # Ensure all classrooms are valid enum values
        valid = {v for v, _ in ClassroomEnum.choices()}
        for room in self.classrooms:
            if room not in valid:
                raise ValidationError(f"Invalid classroom: {room}")

    def __str__(self):
        rooms = ", ".join(self.classrooms)
        return f"{self.course.code} exam on {self.date} in {rooms}"


class DeanExam(models.Model):
    creator = models.ForeignKey(
        AuthorizedUser,
        on_delete=models.CASCADE,
        related_name="exams_created"
    )

    course_codes = models.JSONField(
        default=list,
        help_text="List of course codes from NonDeptCourseEnum"
    )

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    num_proctors = models.PositiveIntegerField(default=1)
    student_count = models.PositiveIntegerField(default=0)

    classrooms = models.JSONField(
        default=list,
        help_text="List of room codes from ClassroomEnum"
    )

    def clean(self):
        # 1) Build allowed set from DB + enum
        real_codes = set(Course.objects.values_list("code", flat=True))
        enum_codes = {code for code, _ in NonDeptCourseEnum.choices()}
        allowed = real_codes.union(enum_codes)

        # 2) course_codes must be non-empty list
        if not isinstance(self.course_codes, list) or not self.course_codes:
            raise ValidationError("`course_codes` must be a non-empty list.")
        
        # 3) Validate each code
        for code in self.course_codes:
            if code not in allowed:
                raise ValidationError(f"Invalid course code: {code}")

        # 4) Classroom validation
        valid_rooms = {v for v, _ in ClassroomEnum.choices()}
        for room in self.classrooms:
            if room not in valid_rooms:
                raise ValidationError(f"Invalid classroom code: {room}")

    def __str__(self):
        courses = ", ".join(self.course_codes)
        rooms   = ", ".join(self.classrooms)
        return f"{courses} exam on {self.date} in {rooms}"