"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/components/general/user-data";

type HistoryRow = {
  id: number;
  initiator: string;   // old TA name
  target: string;      // new TA name
  status: "pending" | "accepted" | "rejected";
  time: string;
  course_code?: string; // e.g. "CS315"

  assignment?: string; // full: "CS315 26.04.2025 20:51–21:52"
  previous?: string;   // old TA name
  staffName?: string;  // who initiated
};

interface Props {
  assignmentId?: number;
  onError?: (msg: string) => void;
}

export default function SwapTimeline({ assignmentId, onError }: Props) {
  const [rows, setRows]       = useState<HistoryRow[]>([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(true);
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = assignmentId
          ? `/swap/history/${assignmentId}/`
          : user.isAuth
            ? "/swap/admin-history/"
            : "/swap/my/";
        const res = await apiClient.get(url);

        if (res.data.status !== "success") {
          throw new Error(res.data.message || "Unexpected response");
        }

        const history: HistoryRow[] = assignmentId
          ? res.data.history
          : (res.data.swaps ?? []).map((s: any) => {
              // extract course_code from the front of s.assignment
              const full = s.assignment || "";
              const code = full.split(" ")[0] || "";

              return {
                id:          s.id,
                initiator:   s.initiator,
                target:      s.target,
                status:      s.status,
                time:        s.time,
                course_code: code,
                assignment:  s.assignment,
                previous:    s.previous_ta,
                staffName:   s.staff_name,
              };
            });

        if (!cancelled) {
          setRows(history);
          setError("");
        }
      } catch (e: any) {
        const msg = e.message || "Network error";
        if (!cancelled) {
          setError(msg);
          onError?.(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [assignmentId, user, userLoading, onError]);

  const iconFor = (st: HistoryRow["status"]) =>
    st === "accepted" ? (
      <Check className="h-4 w-4 text-green-600" />
    ) : st === "rejected" ? (
      <X className="h-4 w-4 text-red-600" />
    ) : (
      <Clock className="h-4 w-4 text-yellow-600" />
    );

  if (loading) return <div className="py-6 text-center">Loading…</div>;
  if (error)  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
  if (!rows.length) return <div className="py-4 text-muted-foreground">No history.</div>;

  return (
    <Accordion type="single" collapsible className="space-y-2">
      {rows.map((row) => (
        <AccordionItem key={row.id} value={`row-${row.id}`}>
          <AccordionTrigger className="flex items-center gap-2">
            {iconFor(row.status)}

            {/* timestamp */}
            <span className="mr-2 text-sm">
              {new Date(row.time).toLocaleString()}
            </span>

            {/* course code */}
            {row.course_code && (
              <span className="mr-2 text-sm font-medium">
                {row.course_code}
              </span>
            )}

            {/* header: old TA → new TA */}
            <span className="flex-1 truncate">
              {row.initiator} → {row.target}
            </span>

            <Badge
              variant={
                row.status === "accepted"  ? "default" :
                row.status === "rejected"  ? "destructive" : "outline"
              }
            >
              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
            </Badge>
          </AccordionTrigger>

          <AccordionContent className="pl-7 py-2 text-sm text-muted-foreground">
            {row.assignment && (
              <>
                <div className="mb-1">
                  <span className="font-medium">Assignment </span>
                  {row.assignment}
                </div>
                Swap initiated by <b>{row.staffName}</b> to replace{" "}
                <b>{row.previous}</b> with <b>{row.target}</b>.
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
