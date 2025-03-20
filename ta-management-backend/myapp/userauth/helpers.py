# myapp/userauth/helpers.py
from myapp.models import TAUser, StaffUser

def find_user_by_email(email):   
    # 1-) Check TA Users
    ta_user = TAUser.objects.filter(email=email).first()
    if ta_user:
        return ta_user, "TA"
    
    # 2-) Check Staff Users
    staff_user = StaffUser.objects.filter(email=email).first()
    if staff_user:
        return staff_user, "Staff"
    
    return None, None
