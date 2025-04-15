import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from myapp.models import Course, TAUser, StaffUser
from myapp.taassignment.models import CourseSection, TASectionAssignment

class Command(BaseCommand):
    help = "Import TA assignment configurations (must-have, preferred, avoided) from a CSV file"

    def handle(self, *args, **options):
        file_path = 'excels/assignment_matrix.csv'

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        try:
            df = pd.read_csv(file_path, delimiter=';')
        except Exception as e:
            raise CommandError(f"Failed to read CSV: {e}")

        required_columns = ['course_code', 'section', 'staff_email', 'min_tas', 'max_tas']
        for col in required_columns:
            if col not in df.columns:
                raise CommandError(f"Missing required column: {col}")

        with transaction.atomic():
            for index, row in df.iterrows():
                course_code = str(row['course_code']).strip()
                section = int(row['section'])
                staff_email = str(row['staff_email']).strip()
                min_tas = int(row['min_tas'])
                max_tas = int(row['max_tas'])

                must_have = str(row.get('must_have_tas', '')).split(',')
                preferred = str(row.get('preferred_tas', '')).split(',')
                avoided = str(row.get('avoided_tas', '')).split(',')

                must_have = [email.strip() for email in must_have if email.strip()]
                preferred = [email.strip() for email in preferred if email.strip()]
                avoided = [email.strip() for email in avoided if email.strip()]

                try:
                    course = Course.objects.get(code=course_code)
                except Course.DoesNotExist:
                    raise CommandError(f"Course {course_code} not found.")

                try:
                    instructor = StaffUser.objects.get(email=staff_email)
                except StaffUser.DoesNotExist:
                    raise CommandError(f"Instructor with email {staff_email} not found.")

                section_obj, created = CourseSection.objects.update_or_create(
                    course=course,
                    section=section,
                    instructor=instructor,
                    defaults={"min_tas": min_tas, "max_tas": max_tas}
                )

                TASectionAssignment.objects.filter(section=section_obj).delete()

                for ta_email in must_have:
                    ta = TAUser.objects.filter(email=ta_email).first()
                    if ta:
                        TASectionAssignment.objects.create(
                            section=section_obj,
                            ta=ta,
                            assignment_type='must_have'
                        )

                for ta_email in preferred:
                    ta = TAUser.objects.filter(email=ta_email).first()
                    if ta:
                        TASectionAssignment.objects.create(
                            section=section_obj,
                            ta=ta,
                            assignment_type='preferred'
                        )

                for ta_email in avoided:
                    ta = TAUser.objects.filter(email=ta_email).first()
                    if ta:
                        TASectionAssignment.objects.create(
                            section=section_obj,
                            ta=ta,
                            assignment_type='avoid'
                        )

                self.stdout.write(self.style.SUCCESS(f"Imported assignments for {course_code} Section {section}"))

        self.stdout.write(self.style.SUCCESS("TA assignments imported successfully."))
