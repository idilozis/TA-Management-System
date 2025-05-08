# myapp/management/commands/import_ta.py
import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.models import TAUser

class Command(BaseCommand):
    help = "Import TA users from a CSV file."

    @transaction.atomic
    def handle(self, *args, **options):
        csv_file_path = 'excels/ta_users.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {csv_file_path}"))

        if not os.path.exists(csv_file_path):
            raise CommandError(f"File not found: {csv_file_path}")

        try:
            df = pd.read_csv(csv_file_path, delimiter=';', encoding='cp1254')
        except Exception as e:
            raise CommandError(f"Error reading CSV: {e}")

        expected_columns = [
            'name',
            'surname',
            'email',
            'student_id',
            'program',   # 'MS' or 'PhD'
            'advisor',   # instructor full name, 'Eray Tüzün'
            'ta_type'    # 'FT' or 'PT'
        ]
        for col in expected_columns:
            if col not in df.columns:
                raise CommandError(f"Missing required column: {col}")

        for _, row in df.iterrows():
            name = str(row['name']).strip()
            surname = str(row['surname']).strip()
            email = str(row['email']).strip().lower()
            student_id  = str(row['student_id']).strip()
            program = str(row['program']).strip() or None
            advisor = str(row['advisor']).strip() or None
            ta_type = str(row['ta_type']).strip() or None

            # Create or update the TAUser record
            ta, created = TAUser.objects.update_or_create(
                email=email,
                defaults={
                    'name': name,
                    'surname': surname,
                    'student_id': student_id,
                    'program': program,
                    'advisor': advisor,
                    'ta_type': ta_type,
                    # workload, password, isTA default values will apply if new
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created TA: {email}"))
            else:
                self.stdout.write(self.style.NOTICE(f"Updated TA: {email}"))

        self.stdout.write(self.style.SUCCESS("All TA users imported/updated successfully."))
