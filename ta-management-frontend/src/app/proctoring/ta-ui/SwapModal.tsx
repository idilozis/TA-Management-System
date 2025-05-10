"use client";
import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Candidate { email: string; name: string; workload: number; reason?: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignmentId: number;                
  examLabel: string;                   
  refresh: () => void;                 
}

export default function SwapModal({ open, onOpenChange, assignmentId, examLabel, refresh }: Props) {
  const [assignable, setAssignable]   = useState<Candidate[]>([]);
  const [unassignable, setUnassignable] = useState<Candidate[]>([]);
  const [selected, setSelected]       = useState<string>("");        // email
  const [loading, setLoading]         = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await apiClient.get(`/swap/candidates/${assignmentId}/`);
        if (data.status === "success") {
          setAssignable(data.assignable);
          setUnassignable(data.unassignable);
          setError("");
        } else {
          setError(data.message || "Could not fetch candidates.");
        }
      } catch {
        setError("Network error.");
      }
      setLoading(false);
    })();
  }, [open, assignmentId]);

 
  async function doSwap() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post("/swap/request/", {
        assignment_id: assignmentId,
        target_ta_email: selected,
      });
      if (data.status === "success") {
        onOpenChange(false);
        refresh();                    
      } else {
        setError(data.message || "Swap failed.");
      }
    } catch {
      setError("Swap failed.");
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setSelected(""); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-600">Swap proctor: {examLabel}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">Loading candidates…</div>
        ) : error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : (
          <>
            <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Available TAs
            </h4>
            <ScrollArea className="h-40 mb-4 border rounded-md">
              {assignable.map((c) => (
                <div key={c.email}
                     className={`flex items-center justify-between px-3 py-2 hover:bg-muted/50 cursor-pointer
                                 ${selected===c.email ? "bg-blue-50" : ""}`}
                     onClick={() => setSelected(c.email)}>
                  <span>{c.name}</span>
                  <Badge variant="outline" className="whitespace-nowrap">
                    Workload&nbsp;•&nbsp;{c.workload}&nbsp;h
                  </Badge>
                </div>
              ))}
              {assignable.length === 0 && (
                <div className="text-sm text-muted-foreground p-3">No available TAs.</div>
              )}
            </ScrollArea>

            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" /> Unavailable TAs
            </h4>
            <ScrollArea className="h-32 mb-4 border rounded-md bg-muted/10">
              {unassignable.map((c) => (
                <div key={c.email}
                     className="flex items-start justify-between px-3 py-1.5 text-muted-foreground text-sm select-none">
                  <span>{c.name}</span>
                  <span className="italic">{c.reason}</span>
                </div>
              ))}
            </ScrollArea>

            <Button disabled={!selected || submitting} onClick={doSwap} className="w-full">
              {submitting ? "Sending…" : "Send swap request"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
