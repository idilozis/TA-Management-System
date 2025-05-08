# myapp/management/commands/import_staff.py
import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.models import StaffUser, Course, Section

class Command(BaseCommand):
    help = "Import staff users and their courses and sections from a CSV file."

    @transaction.atomic
    def handle(self, *args, **options):
        csv_file_path = 'excels/staff_users.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {csv_file_path}"))

        if not os.path.exists(csv_file_path):
            raise CommandError(f"File not found: {csv_file_path}")

        try:
            df = pd.read_csv(csv_file_path, delimiter=';', encoding='cp1254')
        except Exception as e:
            raise CommandError(f"Error reading CSV: {e}")

        expected_columns = ['name', 'surname', 'email', 'department', 'courses', 'sections']
        for col in expected_columns:
            if col not in df.columns:
                raise CommandError(f"Missing required column: {col}")

        for _, row in df.iterrows():
            # Basic staff info
            email        = str(row['email']).strip()
            name         = str(row['name']).strip()
            surname      = str(row['surname']).strip()
            department   = str(row['department']).strip()
            courses_str  = str(row['courses']).strip()
            sections_str = str(row['sections']).strip()

            # Build map: { course_code: [sec1, sec2, …], … }
            section_map: dict[str, list[int]] = {}
            if sections_str:
                for sec_item in sections_str.split(','):
                    if ':' not in sec_item:
                        continue
                    code_part, num_part = sec_item.split(':', 1)
                    code_part = code_part.strip()
                    try:
                        num = int(num_part)
                    except ValueError:
                        continue
                    section_map.setdefault(code_part, []).append(num)

            # Create or fetch the staff user
            staff, created = StaffUser.objects.get_or_create(
                email=email,
                defaults={
                    'name':       name,
                    'surname':    surname,
                    'department': department,
                }
            )

            # Process courses & sections
            if courses_str:
                for course_item in (c.strip() for c in courses_str.split(',') if c.strip()):
                    parts       = course_item.split(' ', 1)
                    course_code = parts[0]
                    course_name = parts[1] if len(parts) > 1 else course_code

                    course, _ = Course.objects.get_or_create(
                        code=course_code,
                        defaults={'name': course_name}
                    )
                    staff.courses_taught.add(course)

                    # Create a Section for each number mapped to this course
                    for sec_num in section_map.get(course_code, []):
                        Section.objects.update_or_create(
                            course=course,
                            number=sec_num,
                            defaults={'instructor': staff}
                        )

        self.stdout.write(self.style.SUCCESS("Staff, courses, and sections imported successfully."))
