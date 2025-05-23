# Generated by Django 5.1.7 on 2025-04-19 23:07

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0017_studentlist_nondept_courses'),
    ]

    operations = [
        migrations.AddField(
            model_name='proctoringassignment',
            name='dean_exam',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='proctoring_assignments', to='myapp.deanexam'),
        ),
        migrations.AlterField(
            model_name='proctoringassignment',
            name='exam',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='proctoring_assignments', to='myapp.exam'),
        ),
        migrations.AlterField(
            model_name='proctoringassignment',
            name='ta',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='proctored_assignments', to='myapp.tauser'),
        ),
    ]
