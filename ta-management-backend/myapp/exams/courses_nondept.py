# myapp/exams/courses_nondept.py
from enum import Enum

class NonDeptCourseEnum(str, Enum):
    MATH101 = "MATH101"
    MATH102 = "MATH102"
    MATH132 = "MATH132"
    MATH225 = "MATH225"
    MATH230 = "MATH230"
    PHYS101 = "PHYS101"
    PHYS102 = "PHYS102"
    GE301 = "GE301"

    @classmethod
    def choices(cls):
        return [(member.value, member.value) for member in cls]
