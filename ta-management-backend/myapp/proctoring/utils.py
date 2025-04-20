# myapp/proctoring/utils.py
from django.shortcuts import get_object_or_404
from myapp.exams.models import Exam, DeanExam

def get_staff_exam_or_404(exam_id):
    return get_object_or_404(Exam, pk=exam_id)

def get_dean_exam_or_404(exam_id):
    return get_object_or_404(DeanExam, pk=exam_id)
