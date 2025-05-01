"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type HistoryRow = {
  swap_id:     number;
  initiator:   string;
  target:      string;
  status:      "pending" | "accepted" | "rejected";
  time:        string;
  course_code: string;
};

export default function MySwapHistoryModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [rows,    setRows]    = useState<HistoryRow[]>([]);
  const [loading, setLoading]= useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    apiClient.get("/swap/my/")
      .then(res => {
        if (res.data.status === "success") {
          setRows(res.data.swaps.map((r: any) => ({
            swap_id:     r.swap_id,
            initiator:   r.role === "sender" ? "You" : r.initiator,
            target:      r.role === "sender" ? r.with_ta_name : "You",
            status:      r.status,
            time:        r.time,
            course_code: r.course_code,
          })));
        } else {
          setError(res.data.message || "Failed to load history.");
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [open]);

  const iconFor = (st: string) =>
    st === "accepted"
      ? <Check className="h-4 w-4 text-green-600" />
      : st === "rejected"
      ? <X className="h-4 w-4 text-red-600" />
      : <Clock className="h-4 w-4 text-yellow-600" />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">My Swap History</DialogTitle>
          <DialogDescription>All your past swaps.</DialogDescription>
        </DialogHeader>

        {loading && <div className="py-6 text-center">Loading…</div>}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="py-4 text-muted-foreground">No history.</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map(r => (
              <div
                key={r.swap_id}
                className="flex items-center gap-2 p-2 border rounded"
              >
                {iconFor(r.status)}
                <span className="w-[180px] text-sm">
                  {new Date(r.time).toLocaleString()}
                </span>
                <span className="w-24 text-sm font-medium">{r.course_code}</span>
                <span className="flex-1 truncate">
                  {r.initiator} → {r.target}
                </span>
                <Badge
                  variant={
                    r.status === "accepted"
                      ? "default"
                      : r.status === "rejected"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
