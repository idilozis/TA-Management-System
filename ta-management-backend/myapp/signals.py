"""
    * This file is for real-time password generation on runserver for newly added users in MySQL (TAs, Staffs)
    * management > assign_passwords.py can also be used by the command:
        python manage.py assign_passwords
"""
# myapps/signals.py
import random
import string
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

from myapp.models import TAUser, StaffUser # Users

def generate_random_password():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

@receiver(post_save, sender=TAUser)
def assign_password_on_create_ta(sender, instance, created, **kwargs):
    if created and (instance.password is None or instance.password == ""):
        new_password = generate_random_password()
        instance.set_password(new_password)  # Hash password
        instance.save()

        # Send the new password via email
        subject = "Your TA Management System Password"
        message = (
            f"Hello {instance.name},\n\n"
            f"Your login email is: {instance.email}\n"
            f"Your password is: {new_password}\n\n"
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.email], fail_silently=False)

        print(f"Auto-assigned password to TAUser {instance.email} and sent email.")


@receiver(post_save, sender=StaffUser)
def assign_password_on_create_ta(sender, instance, created, **kwargs):
    if created and (instance.password is None or instance.password == ""):
        new_password = generate_random_password()
        instance.set_password(new_password)  # Hash password
        instance.save()

        # Send the new password via email
        subject = "Your TA Management System Password"
        message = (
            f"Hello {instance.name},\n\n"
            f"Your login email is: {instance.email}\n"
            f"Your password is: {new_password}\n\n"
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.email], fail_silently=False)

        print(f"Auto-assigned password to StaffUser {instance.email} and sent email.")
