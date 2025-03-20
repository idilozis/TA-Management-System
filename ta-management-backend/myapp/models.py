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
    email = models.EmailField(primary_key=True) # Email PK
    courses = models.CharField(max_length=15, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=255,blank=True,null=True)
    isTA = models.BooleanField(default=False)

    class Meta:
        db_table = 'staff_users'
    
    def __str__(self):
        return f'{self.name} ({self.email})'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


""""
This model can be necessary for later usage.
Remove courses from StaffUser.
Staff members can now access their courses via the related name (i.e., staff_user_instance.courses.all()).

# COURSES
class Course(models.Model):
    code = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=255)

    # Link each course to the related staff member.
    instructor = models.ForeignKey('StaffUser', on_delete=models.CASCADE, related_name="courses")

    # TA relations
    must_have_tas = models.ManyToManyField(TAUser, blank=True, related_name="must_have_for_courses")
    preferred_tas = models.ManyToManyField(TAUser, blank=True, related_name="preferred_for_courses")

    def __str__(self):
        return f"{self.code} - {self.name}"
"""
