# myapp/management/commands/import_staff.py

import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.models import StaffUser, Course

class Command(BaseCommand):
    help = "Import staff users and their courses from a CSV file."

    @transaction.atomic
    def handle(self, *args, **options):
        csv_file_path = 'excels/staff_users.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {csv_file_path}"))

        if not os.path.exists(csv_file_path):
            raise CommandError(f"File not found: {csv_file_path}")

        try:
            # Use UTF-8 as default; fallback to cp1254 if Turkish characters look broken
            try:
                df = pd.read_csv(csv_file_path, delimiter=';', encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(csv_file_path, delimiter=';', encoding='cp1254')

            expected_columns = ['name', 'surname', 'email', 'department', 'courses']
            for col in expected_columns:
                if col not in df.columns:
                    raise CommandError(f"Missing required column: {col}")

            for _, row in df.iterrows():
                email = str(row['email']).strip()
                name = str(row['name']).strip()
                surname = str(row['surname']).strip()
                department = str(row['department']).strip()
                course_str = str(row['courses']).strip()

                staff, created = StaffUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'name': name,
                        'surname': surname,
                        'department': department,
                    }
                )

                # Update name and department if already exists (keep data synced)
                if not created:
                    staff.name = name
                    staff.surname = surname
                    staff.department = department
                    staff.save()

                # Handle courses
                # Store courses in a set before assigning

            courses_seen = set()
            if course_str:
                course_list = [course.strip() for course in course_str.split(',') if course.strip()]
                for course_item in course_list:
                    parts = course_item.split(' ', 1)
                    course_code = parts[0]
                    course_name = parts[1] if len(parts) > 1 else course_code

                    # Avoid adding the same course twice for the same staff
                    if course_code in courses_seen:
                        continue
                    courses_seen.add(course_code)

                    course, _ = Course.objects.get_or_create(
                        code=course_code,
                        defaults={'name': course_name}
                    )
                    staff.courses_taught.add(course)

            self.stdout.write(self.style.SUCCESS("Staff import completed without duplicates."))

        except Exception as e:
            raise CommandError(f"Error while importing staff: {e}")
