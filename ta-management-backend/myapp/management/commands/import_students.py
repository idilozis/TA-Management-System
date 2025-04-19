# myapp/management/commands/import_students.py
import os, pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from myapp.models import StudentList, Course
from myapp.exams.courses_nondept import NonDeptCourseEnum

class Command(BaseCommand):
    help = "Import students from excels/students.csv (semicolon-delimited)"
    
    @transaction.atomic
    def handle(self, *args, **options):
        path = 'excels/students.csv'
        self.stdout.write(self.style.WARNING(f"Reading CSV file from: {path}"))
        if not os.path.exists(path):
            raise CommandError(f"File not found: {path}")

        try:
            df = pd.read_csv(path, delimiter=';', encoding='utf-8-sig')
        except Exception as e:
            raise CommandError(f"Error reading CSV file: {e}")

        # column check
        expected = {'name','surname','id','email','courses'}
        if not expected.issubset({c.lower() for c in df.columns}):
            missing = expected - {c.lower() for c in df.columns}
            raise CommandError(f"Missing columns: {', '.join(missing)}")

        # prepare enum lookup
        valid_nondept = {v for v,_ in NonDeptCourseEnum.choices()}

        for idx, row in df.iterrows():
            name    = str(row['name']).strip()
            surname = str(row['surname']).strip()
            sid     = str(row['id']).strip()
            email   = str(row['email']).strip().lower()
            raw     = str(row.get('courses',''))
            codes   = [c.strip().upper() for c in raw.split(',') if c.strip()]

            if not (name and surname and sid and email):
                self.stderr.write(self.style.ERROR(f"Row {idx}: incomplete student info; skipping."))
                continue

            stu, created = StudentList.objects.update_or_create(
                email=email,
                defaults={'student_id':sid,'name':name,'surname':surname}
            )

            # clear old assignments
            stu.courses.clear()
            stu.nondept_courses = []

            # assign new
            for c in codes:
                # try real Course
                try:
                    course = Course.objects.get(code__iexact=c)
                    stu.courses.add(course)
                    continue
                except Course.DoesNotExist:
                    pass
                # try non‐dept
                if c in valid_nondept:
                    stu.nondept_courses.append(c)
                else:
                    self.stderr.write(self.style.WARNING(f"Row {idx}: unknown course '{c}'; skipping."))

            stu.save()

            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(
                f"{verb} {surname}, {name} ({email}) → dept={stu.courses.count()} | nondept={stu.nondept_courses}"
            ))

        self.stdout.write(self.style.SUCCESS("Student import complete."))
