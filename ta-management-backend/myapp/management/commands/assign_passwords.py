""""
    FOR INITIAL AUTHENTICATION:
    - This file generates random PASSWORDS for a new user in Database.
    - Sends that password to the user's mail address.
    - User can log in the system via their email and this password.
"""""

import random, string
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q

from myapp.models import TAUser, StaffUser # Users

class Command(BaseCommand):
    help = "Generate random passwords for Users missing one, hash them, and send them via email."

    def handle(self, *args, **options):
        ta_users = TAUser.objects.filter(Q(password__isnull=True) | Q(password=''))
        staff_users = StaffUser.objects.filter(Q(password__isnull=True) | Q(password=''))
        all_users = list(ta_users) + list(staff_users)

        if not all_users:
            self.stdout.write("Users with NULL/empty passwords found.")
            return

        for user in all_users:
            random_passw = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            user.set_password(random_passw) # Hash the password
            user.save()

            # Send email the password
            subject = "Your TA Management System Password"
            message = (
                f"Hello {user.name},\n\n"
                f"Your login email is: {user.email}\n"
                f"Your password is: {random_passw}\n\n"
            )
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)

            self.stdout.write(f"Assigned password to {user.email}")
        
        self.stdout.write("Done assigning random passwords to all users with no password.")
