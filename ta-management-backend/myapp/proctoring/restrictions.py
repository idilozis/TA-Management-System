# myapp/proctoring/restrictions.py
"""
GOOGLE OR-TOOLS: CONSTRAINT PROGRAMMING

Steps:
1. Select candidate TAs based on department (via advisor relationship).
2. Create Boolean decision variables for each candidate.
3. Enforce that exactly exam.num_proctors TAs are assigned.
4. Exclude TAs on leave, taking the course (via weekly schedule), or with schedule conflicts.
5. Impose the rule that for MS/PhD courses (course code >= 500), only PhD students are allowed (unless overridden).
6. Minimize a cost function based on TA workload and add penalties for consecutive-day assignments.
7. If not enough TAs are found, first override the MS/PhD restriction.
8. If still not enough, override the department constraint and search all departments.
"""

from ortools.sat.python import cp_model
from datetime import timedelta
from myapp.models import TAUser, StaffUser
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot
from myapp.exams.models import Exam
from django.db.models import Q

class ProctoringAssignmentSolver:
    def __init__(self, exam: Exam):
        self.exam = exam
        self.model = cp_model.CpModel()
        self.assignment_vars = {}
        self.solver = cp_model.CpSolver()
        self.candidate_tas = self.get_candidate_tas()  # initially based on exam's department

    def get_candidate_tas(self):
        # Filter TAs by department based on exam instructor's department.
        department = self.exam.instructor.department
        candidate_tas = TAUser.objects.filter(
            isTA=True,
            advisor__in=StaffUser.objects.filter(department=department).values_list('name', flat=True)
        )
        return list(candidate_tas)
    
    def setup_constraints(self, override=False):
        exam_date = self.exam.date
        exam_weekday = exam_date.strftime('%a').upper()

        # Create Boolean decision variables for each candidate TA.
        for ta in self.candidate_tas:
            self.assignment_vars[ta.email] = self.model.NewBoolVar(ta.email)

        # Constraint: Assign exactly the required number of proctors.
        self.model.Add(
            sum(self.assignment_vars[ta.email] for ta in self.candidate_tas) == self.exam.num_proctors
        )

        # Constraint: Exclude TAs who are on approved leave.
        leaves = TALeaveRequests.objects.filter(
            status='approved',
            start_date__lte=exam_date,
            end_date__gte=exam_date
        )
        tas_on_leave = set(leave.ta_user.email for leave in leaves)
        for email in tas_on_leave:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)
        
        # Constraint: Exclude TAs taking the exam course (based on weekly slot registration).
        enrolled_tas = TAWeeklySlot.objects.filter(
            course=self.exam.course.code
        ).values_list('ta__email', flat=True).distinct()
        for email in enrolled_tas:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)
        
        # Constraint: Exclude TAs with conflicting lecture hours.
        conflicting_slots = TAWeeklySlot.objects.filter(
            day=exam_weekday,
            time_slot=f"{self.exam.start_time.strftime('%H:%M')}-{self.exam.end_time.strftime('%H:%M')}"
        ).values_list('ta__email', flat=True).distinct()
        for email in conflicting_slots:
            if email in self.assignment_vars:
                self.model.Add(self.assignment_vars[email] == 0)

        # Constraint: For MS/PhD courses, allow only PhD students unless overridden.
        course_code_number = int(''.join(filter(str.isdigit, self.exam.course.code)))
        if not override:
            if course_code_number >= 500:  # MS/PhD courses (e.g., cs500, cs690)
                for ta in self.candidate_tas:
                    if ta.program != 'PhD':
                        self.model.Add(self.assignment_vars[ta.email] == 0)
        
        # Objective: Minimize TA workload plus a penalty for consecutive-day proctoring.
        workload_terms = []
        for ta in self.candidate_tas:
            priority_penalty = 0
            prev_date = exam_date - timedelta(days=1)
            next_date = exam_date + timedelta(days=1)
            consecutive_assignments = Exam.objects.filter(
                date__in=[prev_date, next_date],
                proctoringassignment__ta=ta
            ).exists()
            if consecutive_assignments:
                priority_penalty = 500  # Add a penalty if the TA has an assignment the day before or after.
            workload_terms.append((ta.workload * 10 + priority_penalty) * self.assignment_vars[ta.email])
        
        self.model.Minimize(sum(workload_terms))

    def solve(self, override=False):
        # Reset the model and assignment variables for each solve.
        self.model = cp_model.CpModel()
        self.assignment_vars = {}
        self.setup_constraints(override)
        status = self.solver.Solve(self.model)
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return [ta for ta in self.candidate_tas if self.solver.Value(self.assignment_vars[ta.email])]
        else:
            return []
        
    def assign_with_overrides(self):
        """
        Returns a tuple: (assigned_tas, override_info)
         - First, try strict constraints.
         - Then, override the MS/PhD restriction.
         - Finally, if still not enough, override the department constraint.
        """
        # 1. Try strict constraints (department filtering and PhD-only for MS/PhD courses).
        assigned_tas = self.solve(override=False)
        if len(assigned_tas) == self.exam.num_proctors:
            return assigned_tas, {'ms_phd_overridden': False, 'department_overridden': False}
        
        # 2. Override MS/PhD restrictions.
        assigned_tas_ms = self.solve(override=True)
        if len(assigned_tas_ms) == self.exam.num_proctors:
            return assigned_tas_ms, {'ms_phd_overridden': True, 'department_overridden': False}
        
        # 3. Still not enough? Now override the department constraint:
        self.candidate_tas = list(TAUser.objects.filter(isTA=True))
        assigned_tas_dept = self.solve(override=True)
        if len(assigned_tas_dept) == self.exam.num_proctors:
            return assigned_tas_dept, {'ms_phd_overridden': True, 'department_overridden': True}
        
        # Return whatever assignments were found along with the override flags.
        return assigned_tas_dept, {'ms_phd_overridden': True, 'department_overridden': True}

