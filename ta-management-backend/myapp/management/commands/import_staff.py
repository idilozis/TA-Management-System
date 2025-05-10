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
            # UTF-8 with BOM stripping to properly handle Turkish characters
            df = pd.read_csv(csv_file_path, delimiter=';', encoding='utf-8-sig')
        except Exception as e:
            raise CommandError(f"Error reading CSV: {e}")

        expected_columns = ['name', 'surname', 'email', 'department', 'courses', 'sections']
        for col in expected_columns:
            if col not in df.columns:
                raise CommandError(f"Missing required column: {col}")

        # Helper: parse the sections string "CS101:1,CS101:2,CS102:1" into a map
        def parse_section_map(sections_str):
            section_map = {}
            if pd.isna(sections_str) or not str(sections_str).strip():
                return section_map
            for item in str(sections_str).split(','):
                item = item.strip()
                if ':' not in item:
                    self.stdout.write(self.style.WARNING(f"Ignoring malformed section entry: '{item}'"))
                    continue
                code, num = item.split(':', 1)
                code = code.strip()
                try:
                    sec_num = int(num.strip())
                except ValueError:
                    self.stdout.write(self.style.WARNING(f"Ignoring invalid section number in: '{item}'"))
                    continue
                section_map.setdefault(code, []).append(sec_num)
            return section_map

        for index, row in df.iterrows():
            # Read and trim basic fields
            name = str(row['name']).strip()
            surname = str(row['surname']).strip()
            email = str(row['email']).strip()
            department = str(row['department']).strip()
            courses_str = str(row['courses']).strip()
            sections_str = str(row['sections']).strip()

            # Validate required fields
            if not email:
                self.stdout.write(self.style.ERROR(f"Row {index}: email is empty. Skipping."))
                continue
            if not name or not surname:
                self.stdout.write(self.style.ERROR(f"Row {index}: name/surname missing. Skipping '{email}'."))
                continue

            # Parse section map up front
            section_map = parse_section_map(sections_str)

            # Create or update the StaffUser
            staff, created = StaffUser.objects.get_or_create(
                email=email,
                defaults={'name': name, 'surname': surname, 'department': department}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Row {index}: Created staff '{name} {surname}'"))
            else:
                # staff.name = name
                # staff.surname = surname
                # staff.department = department
                # staff.save()
                self.stdout.write(self.style.WARNING(f"Row {index}: Staff '{email}' already exists"))

            # Process each course in the comma-separated list
            if courses_str and courses_str.lower() != 'nan':
                for course_item in courses_str.split(','):
                    course_item = course_item.strip()
                    if not course_item:
                        continue
                    parts = course_item.split(' ', 1)
                    course_code = parts[0]
                    course_name = parts[1] if len(parts) > 1 else parts[0]

                    # Get or create Course
                    course, _ = Course.objects.get_or_create(
                        code=course_code,
                        defaults={'name': course_name}
                    )
                    staff.courses_taught.add(course)
                    self.stdout.write(self.style.SUCCESS(
                        f"Row {index}: Assigned course '{course_code}' to '{email}'"
                    ))

                    # Create/update Sections for this course
                    for sec_num in section_map.get(course_code, []):
                        sec_obj, sec_created = Section.objects.update_or_create(
                            course=course,
                            number=sec_num,
                            defaults={'instructor': staff}
                        )
                        if sec_created:
                            self.stdout.write(self.style.SUCCESS(
                                f"Row {index}: Created Section {course_code}:{sec_num}"
                            ))
                        else:
                            self.stdout.write(self.style.WARNING(
                                f"Row {index}: Updated Section {course_code}:{sec_num}"
                            ))
            else:
                self.stdout.write(self.style.WARNING(f"Row {index}: No courses listed for '{email}'"))

        self.stdout.write(self.style.SUCCESS("Staff, courses, and sections import completed successfully."))
