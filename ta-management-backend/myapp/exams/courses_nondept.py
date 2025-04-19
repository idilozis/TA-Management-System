# myapp/exams/courses_nondept.py
from enum import Enum

class NonDeptCourseEnum(str, Enum):
    MATH101 = "MATH101"
    MATH102 = "MATH102"
    PHYS101 = "PHYS101"
    PHYS102 = "PHYS102"
    ENG101 = "ENG101"
    ENG102 = "ENG102"

    @classmethod
    def choices(cls):
        return [(member.value, member.value) for member in cls]
