# myapp/models.py
from django.db import models
from django.contrib.auth.hashers import make_password, check_password

# TA Users
class TAUser(models.Model):
    name = models.CharField(max_length=255)
    surname = models.CharField(max_length=255)
    student_id = models.CharField(max_length=20, unique=True)
    
    tc_no = models.CharField(max_length=11, unique=True)  
    iban = models.CharField(max_length=34, blank=True, null=True) 
    phone = models.CharField(max_length=15, blank=True, null=True)  
    
    email = models.EmailField(primary_key=True)  # Email PK

    advisor = models.CharField(max_length=255, blank=True, null=True)  
    program = models.CharField(max_length=3, choices=[('MS', 'MS'), ('PhD', 'PhD')])  
    
    password = models.CharField(max_length=255, blank=True, null=True)  # Stores hashed passwords
    
    isTA = models.BooleanField(default=True)  
    workload = models.IntegerField(default=0)

    load = models.IntegerField(default=0)

    TA_TYPE = [
        ('FT', 'Full-time'),
        ('PT', 'Part-time'),
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


# STAFF Users
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


# Import all models for migrations.
from myapp.taassignment.models import TAAssignment
from myapp.taassignment.models import TAAllocation
from myapp.taduties.models import TADuty
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.proctoring.models import ProctoringAssignment
from myapp.notificationsystem.models import Notification
from myapp.exams.models import Exam