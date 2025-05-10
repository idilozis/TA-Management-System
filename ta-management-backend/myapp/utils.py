# myapp/utils.py (TA-advisor department lookup)
from django.db.models import Value
from django.db.models.functions import Concat
from myapp.models import StaffUser

def advisor_department(advisor_name: str) -> str | None:
    """Get the department code (e.g. 'CS', 'IE') from a TA's advisor full name."""
    if not advisor_name or not advisor_name.strip():
        return None

    full = advisor_name.strip()

    # Annotate a combined 'name surname' field and match it exactly (case‐insensitive)
    staff = (
        StaffUser.objects
        .annotate(full_name=Concat('name', Value(' '), 'surname'))
        .filter(full_name__iexact=full)
        .first()
    )

    return staff.department if staff else None