from django.db import models
# Import the StaffUser, TAUser, and Course models
from myapp.models import StaffUser, TAUser, Course

class TAAssignment(models.Model):
    """
    Stores each instructor's TA assignment configuration for a given course (to be imported from Excel).
    """
    # The instructor making the TA assignment config
    staff = models.ForeignKey(
        StaffUser,
        on_delete=models.CASCADE,
        related_name="ta_assignments",
        help_text="Instructor who configures TA assignment for this course."
    )

    # The course for which the TA assignment config is being made
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="assignment_configs",
        help_text="Course for which TAs are being assigned."
    )

    # TA workload limits (in hours or other units)
    min_load = models.PositiveIntegerField(
        default=0,
        help_text="Minimum workload required from a TA in this course."
    )
    max_load = models.PositiveIntegerField(
        default=0,
        help_text="Maximum workload allowed for a TA in this course."
    )

    # Number of graders needed
    num_graders = models.PositiveIntegerField(
        default=0,
        help_text="Number of graders needed for this course."
    )

    # Instructor-defined TA preferences
    must_have_ta = models.ManyToManyField(
        TAUser,
        blank=True,
        related_name="must_have_assignments",
        help_text="TAs that must be assigned to this course."
    )
    
    preferred_tas = models.ManyToManyField(
        TAUser,
        blank=True,
        related_name="preferred_assignment_configs",
        help_text="List of TAs that are preferred for this course."
    )
    
    preferred_graders = models.ManyToManyField(
        TAUser,
        blank=True,
        related_name="preferred_graders_assignments",
        help_text="List of TAs that are preferred as graders for this course."
    )
    
    avoided_tas = models.ManyToManyField(
        TAUser,
        blank=True,
        related_name="avoided_assignments",
        help_text="TAs that should be avoided for this course."
    )

    # Record-keeping fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Ensure a StaffUser can only have one assignment config per Course
    class Meta:
        unique_together = ("staff", "course")
        verbose_name = "TA Assignment Configuration"
        verbose_name_plural = "TA Assignment Configurations"

    def __str__(self):
        return f"Assignment Config for {self.course.code} by {self.staff.email}"
