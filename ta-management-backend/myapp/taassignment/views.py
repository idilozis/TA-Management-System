from django.http import JsonResponse
from myapp.taassignment.models import CourseSection, TASectionAssignment
from myapp.models import TAUser
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import Prefetch
import json

@require_GET
def get_assignments(request):
    sections = CourseSection.objects.select_related('course').all()
    ta_lookup = TAUser.objects.values('email', 'name', 'surname')

    result = []
    for section in sections:
        row = {
            'id': section.id,
            'course_code': section.course.code,
            'section': section.section,
            'min_tas_required': section.min_tas,
            'student_count': section.student_count,
            'assignments': []
        }

        assignments = TASectionAssignment.objects.filter(section=section).select_related('ta')
        for a in assignments:
            row['assignments'].append({
                'ta_email': a.ta.email,
                'ta_name': f"{a.ta.name} {a.ta.surname}",
                'assignment_type': a.assignment_type,
                'load': a.load
            })

        result.append(row)

    return JsonResponse({
        'status': 'success',
        'data': result,
        'ta_lookup': list(ta_lookup)
    })

@csrf_exempt
@require_POST
def update_assignment(request):
    data = json.loads(request.body)
    section_id = data.get('section_id')
    ta_email = data.get('ta_email')
    assignment_type = data.get('assignment_type')
    load = data.get('load', 1)

    if not (section_id and ta_email and assignment_type):
        return JsonResponse({'status': 'error', 'message': 'Missing fields'}, status=400)

    ta = TAUser.objects.filter(email=ta_email).first()
    if not ta:
        return JsonResponse({'status': 'error', 'message': 'TA not found'}, status=404)

    obj, _ = TASectionAssignment.objects.update_or_create(
        section_id=section_id,
        ta=ta,
        defaults={'assignment_type': assignment_type, 'load': load}
    )

    return JsonResponse({'status': 'success', 'message': 'Assignment updated'})
