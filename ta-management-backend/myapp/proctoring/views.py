# myapp/proctoring/views.py
import json
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.db.models import F, Value, Q
from django.db.models.functions import Replace, Lower

from myapp.userauth.helpers import find_user_by_email
from myapp.models import TAUser, StaffUser
from myapp.exams.models import Exam
from myapp.proctoring.models import ProctoringAssignment
from myapp.proctoring.restrictions import ProctoringAssignmentSolver
from myapp.taleave.models import TALeaveRequests
from myapp.schedule.models import TAWeeklySlot

# resolve Advisor → Department (TAUser has advisor (StaffUser) and that advisor holds department variable.)
def advisor_department(advisor):
    if not advisor: return None
    parts = advisor.split()
    first, last = parts[0], parts[-1] if len(parts)>1 else ''
    staff = StaffUser.objects.filter(
        Q(name__iexact=first) & Q(surname__iexact=last)
    ).first()
    return staff.department if staff else None

@require_POST
def automatic_proctor_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get('user_email'))
    if role!='Staff': return JsonResponse({'success':False}, status=403)
    
    exam = Exam.objects.get(id=exam_id)
    
    solver = ProctoringAssignmentSolver(exam)
    
    tas, info = solver.assign_with_overrides()
    return JsonResponse({
        'success':True,
        'assigned_tas':[ta.email for ta in tas],
        'override_info':{
            'consecutive_overridden':info['consec'],
            'ms_phd_overridden':     info['ms'],
            'department_overridden': info['dept'],
        }
    })

@require_POST
def confirm_assignment(request, exam_id):
    user, role = find_user_by_email(request.session.get('user_email'))
    if role!='Staff': return JsonResponse({'success':False}, status=403)
    
    exam = Exam.objects.get(id=exam_id)
    data = json.loads(request.body)
    
    tas = data.get('assigned_tas', [])
    if len(tas)!=exam.num_proctors:
        return JsonResponse({'success':False,'message':'Wrong number of TAs'}, status=400)
    
    hrs = (datetime.combine(exam.date,exam.end_time)-
           datetime.combine(exam.date,exam.start_time)).seconds//3600
    ProctoringAssignment.objects.filter(exam=exam).delete()
    
    for email in tas:
        ta = TAUser.objects.get(email=email)
        ProctoringAssignment.objects.create(exam=exam,ta=ta)
        ta.workload+=hrs; ta.save()
    return JsonResponse({'success':True})

@require_GET
def candidate_tas(request, exam_id):
    user, role = find_user_by_email(request.session.get('user_email'))
    if role!='Staff': return JsonResponse({'status':'error'}, status=403)
    
    exam = Exam.objects.get(id=exam_id)
    date = exam.date
    slot = f"{exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')}"
    norm_code = exam.course.code.replace(' ','').lower()
    instr_dept = exam.instructor.department

    leave_set = set(TALeaveRequests.objects.filter(
        status='approved', start_date__lte=date, end_date__gte=date
    ).values_list('ta_user__email',flat=True))
    
    same_day = set(ProctoringAssignment.objects.filter(
        exam__date=date
    ).values_list('ta__email',flat=True))
    
    adj = set(ProctoringAssignment.objects.filter(
        exam__date__in=[date-timedelta(days=1),date+timedelta(days=1)]
    ).values_list('ta__email',flat=True))
    
    enrolled = set(TAWeeklySlot.objects.annotate(
        norm=Lower(Replace(F('course'),Value(' '),Value('')))
    ).filter(norm=norm_code).values_list('ta__email',flat=True))
    
    conflicts = set(TAWeeklySlot.objects.filter(day=date.strftime('%a').upper(),time_slot=slot)
                   .values_list('ta__email',flat=True))

    assignable, excluded = [], []
    for ta in TAUser.objects.filter(isTA=True):
        reasons=[]
        if ta.email in leave_set: reasons.append('On leave')
        if ta.email in same_day: reasons.append('Same-day proctor')
        if ta.email in adj: reasons.append('Day-before/after')
        if ta.email in enrolled: reasons.append('Enrolled in course')
        if ta.email in conflicts: reasons.append('Lecture conflict')
        
        num=int(''.join(filter(str.isdigit,exam.course.code)))
        if num>=500 and ta.program!='PhD': reasons.append('MS/PhD only')
        
        ta_dept=advisor_department(ta.advisor)
        if ta_dept!=instr_dept: reasons.append(f'Different dept ({ta_dept or 'unknown'})')
        
        rec={'email':ta.email,'first_name':ta.name,'last_name':ta.surname,
             'workload':ta.workload,'program':ta.program,'department':ta_dept or 'Unknown'}
        if reasons:
            excluded.append({**rec,'assignable':False,'reason':'; '.join(reasons)})
        else:
            penalty=1 if ta.email in adj else 0
            assignable.append({**rec,'assignable':True,'penalty':penalty})
    
    assignable.sort(key=lambda x:(x['penalty'],x['workload']))
    return JsonResponse({'status':'success','tas':assignable+excluded})

@require_POST
def ta_details(request):
    user,role=find_user_by_email(request.session.get('user_email'))
    if role!='Staff': return JsonResponse({'success':False},status=403)
    
    emails=json.loads(request.body).get('emails',[])
    
    out=[]
    for email in emails:
        ta=TAUser.objects.filter(email=email).first()
        if ta: out.append({'email':ta.email,'first_name':ta.name,'last_name':ta.surname,'workload':ta.workload,'program':ta.program})
    return JsonResponse({'success':True,'tas':out})