"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type Assignment = {
  assignment_id: number;
  course_code: string;
  date: string;
  ta_name: string;
};

type Candidate = {
  email: string;
  name: string;
  workload: number;
  reason?: string;          
};

interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment: Assignment;
  refresh: () => void;        
}

export default function SwapModalStaff({
  open,
  onOpenChange,
  assignment,
  refresh,
}: ModalProps) {
  const [assignable, setAssignable] = useState<Candidate[]>([]);
  const [unassignable, setUnassignable] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(
          `/swap/candidates-staff/${assignment.assignment_id}/`
        );
        if (res.data.status === "success") {
          setAssignable(res.data.assignable);
          setUnassignable(res.data.unassignable);
          setError("");
        } else {
          setError(res.data.message || "Failed to load candidates");
        }
      } catch {
        setError("Failed to fetch candidates");
      }
      setLoading(false);
    })();
  }, [open, assignment.assignment_id]);

  const doSwap = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/swap/staff-swap/${assignment.assignment_id}/`, {
        new_ta: selected.email,
      });
      setSuccess(`Successfully swapped TA for ${assignment.course_code}`);
      setTimeout(() => {
        onOpenChange(false);
        refresh();
      }, 700);
    } catch {
      setError("Swap failed");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-600">
            Swap proctor for {assignment.course_code}{" "}
            {new Date(assignment.date).toLocaleDateString()}
          </DialogTitle>
          <DialogDescription>
            Select an available TA.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="py-8 text-center">Loading…</div>
        ) : (
          <>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Available TAs
            </h4>
            <ScrollArea className="h-40 rounded border p-2 mb-4">
              {assignable.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No available TAs.
                </div>
              )}
              {assignable.map((ta) => (
                <div
                  key={ta.email}
                  className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer
                    ${selected?.email === ta.email ? "bg-blue-100" : "hover:bg-muted/50"}`}
                  onClick={() => setSelected(ta)}
                >
                  <span>{ta.name}</span>
                  <Badge variant="outline">{ta.workload} h</Badge>
                </div>
              ))}
            </ScrollArea>
            
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" /> Unavailable TAs
            </h4>
            <ScrollArea className="h-32 rounded border p-2">
              {unassignable.length === 0 && (
                <div className="text-sm text-muted-foreground">—</div>
              )}
              {unassignable.map((ta) => (
                <div
                  key={ta.email}
                  className="flex justify-between items-center px-2 py-1 text-muted-foreground text-sm"
                >
                  <span>{ta.name}</span>
                  <span>{ta.reason}</span>
                </div>
              ))}
            </ScrollArea>

            <div className="text-right pt-4">
              <Button className="bg-blue-600 hover:bg-blue-500"
                onClick={doSwap}
                disabled={!selected || submitting}
              >
                {submitting ? "Swapping…" : "Confirm Swap"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}