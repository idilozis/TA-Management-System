import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.taassignment.models import TAAssignment
from myapp.models import StaffUser, Course, TAUser

class Command(BaseCommand):
    help = "Import TA assignment configurations from a CSV file using pandas."

    @transaction.atomic
    def handle(self, *args, **options):
        # Set the CSV file path (relative to manage.py)
        csv_file_path = 'excels/ta_preferrences.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {csv_file_path} using pandas"))

        if not os.path.exists(csv_file_path):
            raise CommandError(f"File not found: {csv_file_path}")

        try:
            # Use an encoding that properly interprets Turkish characters
            df = pd.read_csv(csv_file_path, delimiter=';', encoding='utf-8-sig')
            expected_columns = [
                'instructor_name', 'course_code', 'course_name', 'min_load', 'max_load',
                'num_graders', 'must_have_ta', 'preferred_tas', 'preferred_graders', 'avoided_tas'
            ]
            for col in expected_columns:
                if col not in df.columns:
                    raise CommandError(f"Missing required column: {col}")
        except Exception as e:
            raise CommandError(f"Error reading CSV file: {e}")

        # Helper to look up a TAUser record by full name.
        def get_ta_by_fullname(fullname):
            if not fullname:
                return None
            try:
                first, surname = fullname.strip().split(" ", 1)
                return TAUser.objects.get(name=first, surname=surname)
            except Exception:
                return None

        # Helper: Convert comma-separated string into a list of trimmed items.
        def get_ta_list(field_value):
            if pd.isna(field_value) or not str(field_value).strip():
                return []
            return [item.strip() for item in str(field_value).split(",") if item.strip()]

        for index, row in df.iterrows():
            # Process instructor name (e.g., "Eray Tüzün")
            instructor_name = str(row.get("instructor_name", "")).strip()
            if not instructor_name:
                self.stdout.write(self.style.ERROR(f"Row {index}: instructor_name is empty."))
                continue
            try:
                first_name, surname = instructor_name.split(" ", 1)
            except ValueError:
                self.stdout.write(self.style.ERROR(
                    f"Row {index}: Cannot split instructor_name '{instructor_name}' into first and last name."
                ))
                continue

            try:
                staff = StaffUser.objects.get(name=first_name, surname=surname)
            except StaffUser.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Row {index}: Staff user '{instructor_name}' not found."))
                continue

            # Get Course using course_code
            course_code = str(row.get("course_code", "")).strip()
            if not course_code:
                self.stdout.write(self.style.ERROR(f"Row {index}: course_code is empty."))
                continue
            try:
                course = Course.objects.get(code=course_code)
            except Course.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Row {index}: Course with code '{course_code}' not found."))
                continue

            # Parse numeric values
            try:
                min_load = int(row.get("min_load", 0))
                max_load = int(row.get("max_load", 0))
                num_graders = int(row.get("num_graders", 1))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Row {index}: Error converting numeric values: {e}"))
                continue

            # Create or update the TAAssignment record
            assignment, created = TAAssignment.objects.get_or_create(
                staff=staff,
                course=course,
                defaults={
                    'min_load': min_load,
                    'max_load': max_load,
                    'num_graders': num_graders,
                }
            )
            if not created:
                assignment.min_load = min_load
                assignment.max_load = max_load
                assignment.num_graders = num_graders
                assignment.save()

            # Get lists from CSV fields
            must_have_list = get_ta_list(row.get("must_have_ta", ""))
            preferred_list = get_ta_list(row.get("preferred_tas", ""))
            preferred_graders_list = get_ta_list(row.get("preferred_graders", ""))
            avoided_list = get_ta_list(row.get("avoided_tas", ""))

            # Clear existing many-to-many relationships
            assignment.must_have_ta.clear()
            assignment.preferred_tas.clear()
            assignment.preferred_graders.clear()
            assignment.avoided_tas.clear()

            # Process each TA list using name-based lookup
            for ta_fullname in must_have_list:
                ta = get_ta_by_fullname(ta_fullname)
                if ta:
                    assignment.must_have_ta.add(ta)
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Row {index}: TA '{ta_fullname}' for must_have_ta not found."
                    ))

            for ta_fullname in preferred_list:
                ta = get_ta_by_fullname(ta_fullname)
                if ta:
                    assignment.preferred_tas.add(ta)
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Row {index}: TA '{ta_fullname}' for preferred_tas not found."
                    ))

            for ta_fullname in preferred_graders_list:
                ta = get_ta_by_fullname(ta_fullname)
                if ta:
                    assignment.preferred_graders.add(ta)
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Row {index}: TA '{ta_fullname}' for preferred_graders not found."
                    ))

            for ta_fullname in avoided_list:
                ta = get_ta_by_fullname(ta_fullname)
                if ta:
                    assignment.avoided_tas.add(ta)
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Row {index}: TA '{ta_fullname}' for avoided_tas not found."
                    ))

            self.stdout.write(self.style.SUCCESS(f"Row {index} processed successfully."))

        self.stdout.write(self.style.SUCCESS("CSV import completed successfully."))
