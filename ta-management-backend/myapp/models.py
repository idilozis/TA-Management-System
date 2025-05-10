# myapp/models.py
from django.db import models
from django.contrib.auth.hashers import make_password, check_password

# TA Users
class TAUser(models.Model):
    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    student_id = models.CharField(max_length=20, unique=True)
    
    email = models.EmailField(primary_key=True)  # Email PK

    advisor = models.CharField(max_length=255, blank=True, null=True)  
    program = models.CharField(max_length=3, choices=[('MS', 'MS'), ('PhD', 'PhD')])  
    
    password = models.CharField(max_length=255, blank=True, null=True)  # Stores hashed passwords
    
    isTA = models.BooleanField(default=True)  
    workload = models.IntegerField(default=0)

    TA_TYPE = [
        ('FT', 'Full-time'), # 2 loads
        ('PT', 'Part-time'), # 1 load
    ]
    ta_type = models.CharField(
        max_length=2,
        choices=TA_TYPE,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'ta_users' # use the existing ta_users table in MySQL

    def __str__(self):
        return f'{self.name} {self.surname} ({self.email})'
    
    # Method to hash and store a password.
    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    # Method to verify a raw password against the DB hash.
    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


# STAFF Users (INSTRUCTORS)
class StaffUser(models.Model):
    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    email = models.EmailField(primary_key=True) # Email PK
    department = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=255,blank=True,null=True)

    # Staff users are not TAs
    isTA = models.BooleanField(default=False)

    class Meta:
        db_table = 'staff_users'
    
    def __str__(self):
        return f'{self.name} ({self.email})'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


# COURSES of Instructors
class Course(models.Model):
    code = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=255)

    # Many-to-many: a course can have multiple staff instructors, and a staff can teach multiple courses.
    instructors = models.ManyToManyField(
        StaffUser, 
        related_name="courses_taught",
        blank=True
    )

    def __str__(self):
        return f"{self.code} - {self.name}"

# SECTIONS of Instructors
class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sections")
    instructor = models.ForeignKey(StaffUser, on_delete=models.CASCADE, related_name="sections")
    number = models.PositiveSmallIntegerField(help_text="Section number (e.g. 1, 2…)")

    class Meta:
        unique_together = ('course', 'number')
        ordering = ['course', 'number']

    def __str__(self):
        return f"{self.course.code} Sec {self.number}: {self.instructor.name} {self.instructor.surname}"


# Authorized Users: Department Secretaries, Dean Office, and Admin
class AuthorizedUser(models.Model):
    ROLE_CHOICES = [
        ('CS SECRETARY', 'CS Secretary'),
        ('IE SECRETARY', 'IE Secretary'),
        ('EEE SECRETARY', 'ME Secretary'),
        ('ME SECRETARY', 'EEE Secretary'),
        ('DEAN', 'Dean'),
        ('ADMIN', 'Admin'),
    ]

    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    email = models.EmailField(primary_key=True)  # Email PK
    password = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    # Not a TA, but has authorization
    isTA = models.BooleanField(default=False)
    isAuth = models.BooleanField(default=True)

    class Meta:
        db_table = 'authorized_users'

    def __str__(self):
        return f'{self.role}: {self.name} {self.surname}'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)
    

# This class represents the necessary modal for printing student distribution for an exam.
class StudentList(models.Model):
    student_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    email = models.EmailField(primary_key=True)
    courses = models.ManyToManyField(
        Course,
        related_name="students",
        blank=True,
    )
    nondept_courses = models.JSONField(
        default=list,
        blank=True,
        help_text="List of non-departmental course codes from NonDeptCourseEnum"
    )

    class Meta:
        db_table = 'students'

    def __str__(self):
        return f"{self.surname}, {self.name} ({self.student_id})"

# This class represents the necessary modal for ADMIN users.
class GlobalSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    current_semester = models.CharField(max_length=50, default=None, blank=True, null=True)
    max_ta_workload = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'admin_settings'

    def __str__(self):
        return "Global Settings"


# Import all models for migrations.
from myapp.userauth.models import AuthLog
from myapp.taassignment.models import TAAssignment
from myapp.taassignment.models import TAAllocation
from myapp.taduties.models import TADuty
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.proctoring.models import ProctoringAssignment
from myapp.notificationsystem.models import Notification
from myapp.exams.models import Exam
from myapp.exams.models import DeanExam
from myapp.swap.models import SwapRequest