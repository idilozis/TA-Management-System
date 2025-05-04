# myapp/proctoring/restrictions.py
"""
GOOGLE OR-TOOLS: CONSTRAINT PROGRAMMING

This solver picks TAs for an Exam while enforcing:
 1. Department-based advisor matching,
 2. Leave / same-day / adjacent-day exclusions,
 3. Lecture conflicts and enrollment in the same course,
 4. MS/PhD rule for 500+ level courses,
 5. PLUS a “bonus” for any TA already allocated to this course (via TAAllocation).

Override order, if there aren't enough candidates:
 - Drop adjacent-day exclusion
 - Drop MS/PhD restriction
 - Finally drop department filter entirely
"""

from ortools.sat.python import cp_model
from datetime import timedelta
from django.db.models import Q, F, Value
from django.db.models.functions import Replace, Lower

from myapp.models import TAUser, StaffUser, Course
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.exams.models import Exam
from myapp.proctoring.models import ProctoringAssignment
from myapp.taassignment.models import TAAllocation


class ProctoringAssignmentSolver:
    def __init__(self, exam: Exam):
        self.exam = exam

        # 1) Derive department from course.code (alphabetic prefix)
        code = exam.course.code
        dept = ''.join(filter(str.isalpha, code))

        # 2) Find all StaffUsers in that department → advisor names
        staffs = StaffUser.objects.filter(department__iexact=dept)
        advisor_names = [f"{s.name} {s.surname}" for s in staffs]

        # 3) Seed candidate_tas to TAs whose advisor matches
        self.candidate_tas = list(
            TAUser.objects.filter(isTA=True, advisor__in=advisor_names)
        )

        # 4) If this is a *real* Course instance, grab the latest TAAllocation
        #    to give those TAs a small “bonus” in the objective.
        if isinstance(exam.course, Course):
            alloc = (
                TAAllocation.objects
                .filter(course=exam.course)
                .order_by('-created_at')
                .first()
            )
            if alloc:
                self.allocated_emails = set(
                    alloc.assigned_tas.values_list('email', flat=True)
                )
            else:
                self.allocated_emails = set()
        else:
            # FakeExam or stub—no allocations apply
            self.allocated_emails = set()

        # Prepare the CP-SAT model and solver
        self.model = cp_model.CpModel()
        self.assignment_vars = {}
        self.solver = cp_model.CpSolver()

    def setup_constraints(self, override_consec=False, override_ms=False):
        exam = self.exam
        date = exam.date
        yesterday = date - timedelta(days=1)
        tomorrow  = date + timedelta(days=1)
        slot = f"{exam.start_time:%H:%M}-{exam.end_time:%H:%M}"
        code_norm = exam.course.code.replace(' ', '').lower()

        # 1) Create a BoolVar for each candidate TA
        for ta in self.candidate_tas:
            self.assignment_vars[ta.email] = self.model.NewBoolVar(ta.email)

        # 2) Enforce exactly num_proctors chosen
        self.model.Add(
            sum(self.assignment_vars[email] for email in self.assignment_vars)
            == exam.num_proctors
        )

        # 3) Exclude TAs on approved leave for that date
        leave_emails = TALeaveRequests.objects.filter(
            status='approved',
            start_date__lte=date, end_date__gte=date
        ).values_list('ta_user__email', flat=True)
        for email in leave_emails:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 4) Exclude any TA already proctoring (staff or dean) on the same day
        same_day = ProctoringAssignment.objects.filter(
            Q(exam__date=date) | Q(dean_exam__date=date)
        ).values_list('ta__email', flat=True)
        for email in same_day:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 5) Exclude adjacent-day assignments unless override_consec=True
        adj_days = ProctoringAssignment.objects.filter(
            Q(exam__date__in=[yesterday, tomorrow]) |
            Q(dean_exam__date__in=[yesterday, tomorrow])
        ).values_list('ta__email', flat=True)
        if not override_consec:
            for email in adj_days:
                if email in self.assignment_vars:
                    self.model.Add(self.assignment_vars[email] == 0)

        # 6) Exclude TAs enrolled in this course (via weekly slots)
        enrolled = TAWeeklySlot.objects.annotate(
            norm=Lower(Replace(F('course'), Value(' '), Value('')))
        ).filter(norm=code_norm).values_list('ta__email', flat=True)
        for email in enrolled:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 7) Exclude TAs with a lecture time conflict
        weekday = date.strftime('%a').upper()
        conflicts = TAWeeklySlot.objects.filter(
            day=weekday, time_slot=slot
        ).values_list('ta__email', flat=True)
        for email in conflicts:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # 8) MS/PhD restriction for 500+ course numbers
        course_num = int(''.join(filter(str.isdigit, exam.course.code)))
        if course_num >= 500 and not override_ms:
            for ta in self.candidate_tas:
                if ta.program != 'PhD':
                    self.model.Add(self.assignment_vars[ta.email] == 0)

        # 9) Build objective: minimize sum(workload*10 + adjacent penalty - allocation bonus)
        terms = []
        for ta in self.candidate_tas:
            # a) penalty for adjacent-day duty
            penalty = 500 if ProctoringAssignment.objects.filter(
                Q(exam__date__in=[yesterday, tomorrow]) |
                Q(dean_exam__date__in=[yesterday, tomorrow]),
                ta=ta
            ).exists() else 0

            # b) base cost = workload*10 + penalty
            base_cost = ta.workload * 10 + penalty

            # c) subtract a small bonus if already allocated to this course
            if ta.email in self.allocated_emails:
                base_cost -= 50

            terms.append(base_cost * self.assignment_vars[ta.email])

        self.model.Minimize(sum(terms))

    def solve(self, override_consec=False, override_ms=False):
        # Reset model and variables
        self.model = cp_model.CpModel()
        self.assignment_vars.clear()
        self.setup_constraints(override_consec, override_ms)

        status = self.solver.Solve(self.model)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return [
                ta for ta in self.candidate_tas
                if self.solver.Value(self.assignment_vars[ta.email])
            ]
        return []

    def assign_with_overrides(self):
        # Try strict → drop adjacent → drop MS → finally drop dept
        for override_consec, override_ms, _ in [
            (False, False, False),
            (True,  False, False),
            (True,  True,  False),
        ]:
            assigned = self.solve(override_consec, override_ms)
            if len(assigned) == self.exam.num_proctors:
                return assigned, {
                    'consec': override_consec,
                    'ms':     override_ms,
                    'dept':   False
                }

        # Last resort: drop department filter entirely
        from myapp.models import TAUser
        self.candidate_tas = list(TAUser.objects.filter(isTA=True))
        assigned = self.solve(True, True)
        return assigned, {'consec': True, 'ms': True, 'dept': True}
