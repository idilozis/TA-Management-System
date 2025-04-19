# myapp/exams/classrooms.py
from enum import Enum

class ClassroomEnum(str, Enum):
    B_Z01 = "B-Z01"
    B_107 = "B-107"
    EE_03 = "EE-03"
    EE_04 = "EE-04"
    EE_214 = "EE-214"
    EE_412 = "EE-412"
    G_Z06 = "G-Z06"
    G_154 = "G-154"
    H_335 = "H-335"
    T_173 = "T-173"
    # ...

    @classmethod
    def choices(cls):
        return [(member.value, member.value) for member in cls]