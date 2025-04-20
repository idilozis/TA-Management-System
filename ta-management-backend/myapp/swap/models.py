from datetime import datetime
from django.db import models, transaction
from django.utils import timezone
from django.db.models import F

from myapp.models import TAUser
from myapp.proctoring.models import ProctoringAssignment                
from myapp.notificationsystem.views import create_notification         


SWAP_STATUS = [
    ("pending",   "Pending"),      
    ("accepted",  "Accepted"),    
    ("rejected",  "Rejected"),     
    ("cancelled", "Cancelled"),   
]

class SwapRequest(models.Model):
    """A single TA‑to‑TA swap offer for one ProctoringAssignment."""
    original_assignment = models.ForeignKey(
        ProctoringAssignment,
        on_delete=models.CASCADE,
        related_name="swap_requests",
    )

    requested_by = models.ForeignKey(          
        TAUser,
        on_delete=models.CASCADE,
        related_name="swap_requests_sent",
    )
    requested_to = models.ForeignKey(           
        TAUser,
        on_delete=models.CASCADE,
        related_name="swap_requests_received",
    )

    status       = models.CharField(max_length=10, choices=SWAP_STATUS, default="pending")
    created_at   = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "swap_requests"
        unique_together = ("original_assignment", "status")

    def __str__(self):
        target = self.original_assignment.exam or self.original_assignment.dean_exam
        return f"Swap #{self.pk} — {target} — {self.requested_by.email} ➜ {self.requested_to.email}"

    @transaction.atomic
    def accept(self):
    
        if self.status != "pending":
            raise ValueError("Swap request is not pending")

        assignment   = self.original_assignment
        old_ta       = self.requested_by
        new_ta       = self.requested_to

        target_exam  = assignment.exam or assignment.dean_exam
        hours = (
            datetime.combine(target_exam.date,  target_exam.end_time)
            - datetime.combine(target_exam.date, target_exam.start_time)
        ).seconds // 3600 or 1  

        assignment.ta = new_ta
        assignment.save(update_fields=["ta"])

        TAUser.objects.filter(email=old_ta.email).update(workload=F("workload") - hours)
        TAUser.objects.filter(email=new_ta.email).update(workload=F("workload") + hours)

        self.status       = "accepted"
        self.responded_at = timezone.now()
        self.save(update_fields=["status", "responded_at"])

        create_notification(
            recipient_email=old_ta.email,
            message=f"{new_ta.name} accepted your proctor‑swap for {target_exam}."
        )
        create_notification(
            recipient_email=new_ta.email,
            message=f"You are now proctoring {target_exam} (swapped with {old_ta.name})."
        )
