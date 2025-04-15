# myapp/management/commands/import_staff.py
import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.models import StaffUser, Course

class Command(BaseCommand):
    help = "Import staff users and their courses from a CSV file using pandas."

    @transaction.atomic
    def handle(self, *args, **options):
        # Set the CSV file path (relative to the manage.py location)
        csv_file_path = 'excels/staff_users.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {csv_file_path} using pandas"))

        # Check if the CSV file exists
        if not os.path.exists(csv_file_path):
            raise CommandError(f"File not found: {csv_file_path}")

        try:
            # Read the CSV file using pandas with the appropriate Turkish character encoding
            df = pd.read_csv(csv_file_path, delimiter=';', encoding='cp1254')
            
            # Make sure the required columns are present
            expected_columns = ['name', 'surname', 'email', 'department', 'courses']
            for col in expected_columns:
                if col not in df.columns:
                    raise CommandError(f"Missing required column: {col}")

            # Process each row in the DataFrame
            for index, row in df.iterrows():
                email = str(row['email']).strip()
                name = str(row['name']).strip()
                surname = str(row['surname']).strip()
                department = str(row['department']).strip()
                courses_str = str(row['courses']).strip()

                # Get or create the StaffUser record based on email
                staff, created = StaffUser.objects.get_or_create(
                    email=email,
                    defaults={
                        'name': name,
                        'surname': surname,
                        'department': department,
                    }
                )

                # Process the courses field if it is not empty
                if courses_str:
                    # Split courses by comma and remove extra spaces
                    course_list = [course.strip() for course in courses_str.split(',') if course.strip()]
                    for course_item in course_list:
                        # Split the course item into course code and course name
                        parts = course_item.split(' ', 1)
                        course_code = parts[0]
                        course_name = parts[1] if len(parts) > 1 else course_code

                        # Get or create the Course record using the course code
                        course, _ = Course.objects.get_or_create(
                            code=course_code,
                            defaults={'name': course_name}
                        )
                        # Add the course to the staff user's many-to-many field
                        staff.courses_taught.add(course)

            self.stdout.write(self.style.SUCCESS("Staff import using pandas completed successfully."))

        except Exception as e:
            raise CommandError(f"An error occurred during import: {e}")