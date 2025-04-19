from django.db import migrations, models
from django.db.migrations.operations.special import SeparateDatabaseAndState

class Migration(migrations.Migration):
    dependencies = [
        ('myapp', '0013_authorizeduser_remove_tauser_load'),
    ]

    operations = [
        SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(
                    model_name='exam',
                    name='classroom_name',
                ),
            ],
        ),

        SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='exam',
                    name='classrooms',
                    field=models.JSONField(
                        default=list,
                        help_text='List of room codes from ClassroomEnum'
                    ),
                ),
            ],
        ),
        
        migrations.AlterField(
            model_name='taduty',
            name='duty_type',
            field=models.CharField(
                choices=[
                    ('lab', 'Lab'),
                    ('grading', 'Grading'),
                    ('recitation', 'Recitation'),
                    ('office_hours', 'Office Hours'),
                    ('other', 'Other'),
                ],
                default='other',
                help_text='Type of duty performed.',
                max_length=20,
            ),
        ),
    ]
