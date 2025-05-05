# myapp/utils.py (advisor department lookup)
from myapp.models import StaffUser

def advisor_department(advisor_name: str) -> str | None:
    """Get the department code (e.g. 'CS', 'IE') from a TA's advisor full name."""
    if not advisor_name:
        return None

    parts = advisor_name.strip().split()
    # first token is name, last token is surname
    first, last = parts[0], parts[-1]

    staff = StaffUser.objects.filter(
        name__iexact=first,
        surname__iexact=last
    ).first()

    return staff.department if staff else None