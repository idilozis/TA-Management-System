from django.http import JsonResponse
from django.db.models import Count
from myapp.models import TAUser, StaffUser
from myapp.proctoring.models import ProctoringAssignment
from myapp.taduties.models import TADuty

def ta_workload_data(request):
    """
    Returns top 10 TAs by .workload as JSON:
      [{ "name": "Alice Smith", "workload": 42 }, …]
    """
    top10 = (
        TAUser.objects
        .filter(isTA=True)
        .order_by('-workload')[:10]
        .values_list('name', 'surname', 'workload')
    )
    result = [
        { "name": f"{n} {s}", "workload": w }
        for n, s, w in top10
    ]
    return JsonResponse(result, safe=False)


def department_comparison_data(request):
    """
    Returns JSON:
      {
        labels: ["CS","IE","EEE","ME"],
        proctorCounts: [12,8,3],
        dutyCounts:    [45,32,5]
      }
    Grouped by each TA's advisor → staff.department.
    """
    # Build advisor-name → department map
    staff_qs = StaffUser.objects.all().only('name','surname','department')
    adv_to_dept = {
        f"{user.name} {user.surname}": (user.department or "Other")
        for user in staff_qs
    }

    stats = {}
    # Proctoring tallies
    for pa in ProctoringAssignment.objects.select_related('ta'):
        adv = pa.ta.advisor or ""
        dept = adv_to_dept.get(adv, "Other")
        stats.setdefault(dept, [0,0])[0] += 1

    # Approved duties tallies
    for duty in TADuty.objects.filter(status="approved").select_related('ta_user'):
        adv = duty.ta_user.advisor or ""
        dept = adv_to_dept.get(adv, "Other")
        stats.setdefault(dept, [0,0])[1] += 1

    labels        = list(stats.keys())
    proctorCounts = [ stats[d][0] for d in labels ]
    dutyCounts    = [ stats[d][1] for d in labels ]

    return JsonResponse({
        "labels": labels,
        "proctorCounts": proctorCounts,
        "dutyCounts": dutyCounts,
    })
