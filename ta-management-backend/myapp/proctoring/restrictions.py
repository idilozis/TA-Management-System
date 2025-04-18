# myapp/proctoring/restrictions.py
"""
GOOGLE OR-TOOLS: CONSTRAINT PROGRAMMING

Proctoring Steps:
1. Select candidate TAs based on department (via advisor → StaffUser lookup).
2. Create a Boolean decision variable for each TA indicating assignment.
3. Enforce that exactly `exam.num_proctors` variables are true.
4. Exclude any TA on approved leave for the exam date.
5. Exclude any TA already proctoring an exam on the same date.
6. Exclude any TA assigned the day before or after the exam  
    (treated as a hard exclusion initially, but can be dropped if needed).
7. Exclude any TA enrolled in the same course (by normalizing weekly-slot course codes).
8. Exclude any TA with a lecture at the exam's time slot.
9. Impose the MS/PhD rule: for course numbers ≥ 500, allow only PhD-program TAs  
    (unless that restriction is overridden).
10. Define an objective to minimize  
        `(TA.workload * 10) + (500 penalty if the TA has any consecutive-day assignment)`  
    so that lower-workload TAs without adjacent-day duties are preferred.

Override strategy (in order):
- **First**, if we still lack enough TAs, drop the “no day before/after” exclusion.
- **Second**, if we remain short, drop the MS/PhD restriction.
- **Finally**, if still short, drop the department filter entirely and consider all TAs.
"""
from ortools.sat.python import cp_model
from datetime import timedelta
from django.db.models import F, Value
from django.db.models.functions import Replace, Lower

from myapp.models import TAUser, StaffUser
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.exams.models import Exam
from myapp.proctoring.models import ProctoringAssignment

class ProctoringAssignmentSolver:
    def __init__(self, exam: Exam):
        self.exam = exam
        # Department is prefix letters of course code (e.g. 'CS' from 'CS315')
        code = exam.course.code
        dept = ''.join([c for c in code if not c.isdigit()])
        # Find all staff users in that department
        staffs = StaffUser.objects.filter(department__iexact=dept)
        # Build advisor names
        advisor_names = [f"{s.name} {s.surname}" for s in staffs]
        # Initial candidates: TAs whose advisor matches
        self.candidate_tas = list(
            TAUser.objects.filter(isTA=True, advisor__in=advisor_names)
        )
        self.model = cp_model.CpModel()
        self.assignment_vars = {}
        self.solver = cp_model.CpSolver()

    def setup_constraints(self, override_consec=False, override_ms=False):
        exam = self.exam
        date = exam.date
        slot = f"{exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')}"
        code_norm = exam.course.code.replace(' ', '').lower()

        # 1) Boolean variable per candidate TA
        for ta in self.candidate_tas:
            self.assignment_vars[ta.email] = self.model.NewBoolVar(ta.email)

        # 2) Exactly exam.num_proctors must be chosen
        self.model.Add(
            sum(self.assignment_vars[email] for email in self.assignment_vars)
            == exam.num_proctors
        )

        # 3) Exclude TAs on approved leave
        leave_emails = TALeaveRequests.objects.filter(
            status='approved',
            start_date__lte=date, end_date__gte=date
        ).values_list('ta_user__email', flat=True)
        for email in leave_emails:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 4) Exclude same-day proctoring
        same_day = ProctoringAssignment.objects.filter(
            exam__date=date
        ).values_list('ta__email', flat=True)
        for email in same_day:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 5) Exclude day-before/after unless override_consec
        adj_days = ProctoringAssignment.objects.filter(
            exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)]
        ).values_list('ta__email', flat=True)
        if not override_consec:
            for email in adj_days:
                if email in self.assignment_vars:
                    self.model.Add(self.assignment_vars[email] == 0)

        # 6) Exclude TAs enrolled in this course
        enrolled = TAWeeklySlot.objects.annotate(
            norm=Lower(Replace(F('course'), Value(' '), Value('')))
        ).filter(norm=code_norm).values_list('ta__email', flat=True)
        for email in enrolled:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 7) Exclude lecture time conflicts
        weekday = date.strftime('%a').upper()
        conflicts = TAWeeklySlot.objects.filter(
            day=weekday, time_slot=slot
        ).values_list('ta__email', flat=True)
        for email in conflicts:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 8) MS/PhD restriction for courses >= 500
        course_num = int(''.join(filter(str.isdigit, exam.course.code)))
        if course_num >= 500 and not override_ms:
            for ta in self.candidate_tas:
                if ta.program != 'PhD':
                    self.model.Add(self.assignment_vars[ta.email] == 0)

        # 9) Objective: minimize workload*10 + penalty for adjacent days
        terms = []
        for ta in self.candidate_tas:
            penalty = 0
            if ProctoringAssignment.objects.filter(
                exam__date__in=[date - timedelta(days=1), date + timedelta(days=1)],
                ta=ta
            ).exists():
                penalty = 500
            terms.append((ta.workload * 10 + penalty) * self.assignment_vars[ta.email])
        self.model.Minimize(sum(terms))

    def solve(self, override_consec=False, override_ms=False):
        self.model = cp_model.CpModel()
        self.assignment_vars.clear()
        self.setup_constraints(override_consec, override_ms)
        status = self.solver.Solve(self.model)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return [ta for ta in self.candidate_tas
                    if self.solver.Value(self.assignment_vars[ta.email])]
        return []

    def assign_with_overrides(self):
        # strict
        assigned = self.solve(False, False)
        if len(assigned) == self.exam.num_proctors:
            return assigned, {'consec':False, 'ms':False, 'dept':False}
        # drop consecutive-day
        assigned = self.solve(True, False)
        if len(assigned) == self.exam.num_proctors:
            return assigned, {'consec':True, 'ms':False, 'dept':False}
        # drop ms/phd
        assigned = self.solve(True, True)
        if len(assigned) == self.exam.num_proctors:
            return assigned, {'consec':True, 'ms':True, 'dept':False}
        # drop department filter
        self.candidate_tas = list(TAUser.objects.filter(isTA=True))
        assigned = self.solve(True, True)
        return assigned, {'consec':True, 'ms':True, 'dept':True}