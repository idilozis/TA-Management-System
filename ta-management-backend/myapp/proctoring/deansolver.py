# myapp/proctoring/deansolver.py
from myapp.proctoring.restrictions import ProctoringAssignmentSolver as BaseSolver
from types import SimpleNamespace
from myapp.models import TAUser, GlobalSettings

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

        # Override: For dean exams (enum logic), consider *all* TAs under the same workload cap
        settings = GlobalSettings.objects.filter(pk=1).first()
        max_wl = settings.max_ta_workload if settings else None
        qs = TAUser.objects.filter(isTA=True)
        if max_wl and max_wl > 0:
            qs = qs.filter(workload__lte=max_wl)

        self.candidate_tas = list(qs)
