# myapp/proctoring/deansolver.py
from myapp.proctoring.restrictions import ProctoringAssignmentSolver as BaseSolver
from types import SimpleNamespace
from myapp.models import TAUser

class DeanProctoringSolver(BaseSolver):
    def __init__(self, dean_exam):
        first_code = dean_exam.course_codes[0] if dean_exam.course_codes else ""
        fake_exam = SimpleNamespace(
          course = SimpleNamespace(code=first_code),
          date = dean_exam.date,
          start_time = dean_exam.start_time,
          end_time = dean_exam.end_time,
          num_proctors = dean_exam.num_proctors,
        )
        super().__init__(fake_exam)
        self.candidate_tas = list(TAUser.objects.filter(isTA=True))
