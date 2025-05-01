# myapp/swap/models.py
from datetime import datetime
from django.db import models, transaction
from django.utils import timezone
from django.db.models import F

from myapp.models import TAUser, AuthorizedUser
from myapp.proctoring.models import ProctoringAssignment
from myapp.notificationsystem.views import create_notification

SWAP_STATUS = [
    ("pending",   "Pending"),
    ("accepted",  "Accepted"),
    ("rejected",  "Rejected"),
    ("cancelled", "Cancelled"),
]

class SwapRequest(models.Model):
    original_assignment = models.ForeignKey(
        ProctoringAssignment,
        on_delete=models.CASCADE,
        related_name="swap_requests",
    )
    requested_by = models.ForeignKey(
        TAUser, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="swap_requests_sent",
    )
    requested_by_staff = models.ForeignKey(
        AuthorizedUser, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_swaps_made",
    )
    requested_to = models.ForeignKey(
        TAUser,
        on_delete=models.CASCADE,
        related_name="swap_requests_received",
    )
    previous_ta = models.ForeignKey(
        TAUser, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="swap_as_previous_ta",
    )
    status       = models.CharField(max_length=10, choices=SWAP_STATUS, default="pending")
    created_at   = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "swap_requests"

    def __str__(self):
        target = self.original_assignment.exam or self.original_assignment.dean_exam
        return f"Swap #{self.pk} — {target} — {self.requested_by.email} ➜ {self.requested_to.email}"

    @transaction.atomic
    def accept(self):
        if self.status != "pending":
            raise ValueError("Swap request is not pending")

        # 1) Grab entities
        assignment = self.original_assignment
        old_ta     = self.requested_by
        new_ta     = self.requested_to

        # 2) Compute exam duration in hours
        exam = assignment.exam or assignment.dean_exam
        start = datetime.combine(exam.date, exam.start_time)
        end   = datetime.combine(exam.date, exam.end_time)
        hours = (end - start).total_seconds() / 3600.0

        # 3) Reassign the proctoring assignment
        assignment.ta = new_ta
        assignment.save(update_fields=["ta"])

        # 4) Bulk‐update workloads
        TAUser.objects.filter(pk=old_ta.pk).update(workload=F("workload") - hours)
        TAUser.objects.filter(pk=new_ta.pk).update(workload=F("workload") + hours)

        # 5) Mark swap accepted
        self.status       = "accepted"
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "responded_at"])

        # 6) Notifications
        create_notification(
            recipient_email=old_ta.email,
            message=f"{new_ta.name} accepted your proctor-swap for {exam}."
        )
        create_notification(
            recipient_email=new_ta.email,
            message=f"You are now proctoring {exam} (swapped with {old_ta.name})."
        )
