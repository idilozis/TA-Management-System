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
  initiator: string;
  target: string;
  status: "pending" | "accepted" | "rejected" | "staff";
  time: string;

  assignment?: string;   // secretary only
  previous?:   string;   // secretary only
};

interface Props {
  assignmentId?: number;       
  onError?: (msg: string) => void;
}


export default function SwapTimeline({ assignmentId, onError }: Props) {
  const [rows,    setRows   ] = useState<HistoryRow[]>([]);
  const [error,   setError  ] = useState("");
  const [loading, setLoading] = useState(true);

  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    let cancelled = false;

    if (userLoading) return;

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {

        const url = assignmentId
          ? `/swap/history/${assignmentId}/`
          : user.isAuth
              ? "/swap/admin-history/"
              : "/swap/my/";

        const res = await apiClient.get(url);

        if (!res.data || res.data.status !== "success")
          throw new Error(res.data?.message ?? "Unexpected response");

        const history: HistoryRow[] = assignmentId
  ? res.data.history             
  : (res.data.swaps ?? []).map((s: any) => {
      if (s.assignment) {      
        return {
          id:        s.id,
          initiator: s.initiator,
          target:    s.target,
          status:    s.status,
          time:      s.time,
          assignment: s.assignment,      
          previous:   s.previous_ta,     
        };
      }
      
      return {
        id:      s.swap_id,
        initiator: s.role === "sender" ? "You" : s.with_ta,
        target:    s.role === "sender" ? s.with_ta : "You",
        status:    s.status,
        time:      s.created_at,
      };
    });

        if (!cancelled) {
          setRows(history);
          setError("");
        }
      } catch (e: any) {
        const msg = e?.message ?? "Network error";
        if (!cancelled) {
          setError(msg);
          onError?.(msg);
        }
      } finally {
        !cancelled && setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignmentId, userLoading, user, onError]);

  const iconFor = (st: HistoryRow["status"]) =>
    st === "accepted" || st === "staff" ? (
      <Check className="h-4 w-4 text-green-600 shrink-0" />
    ) : st === "rejected" ? (
      <X className="h-4 w-4 text-red-600 shrink-0" />
    ) : (
      <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
    );

  if (loading) return <div className="py-6 text-center">Loading…</div>;

  if (error)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (rows.length === 0)
    return <div className="text-muted-foreground py-4">No history.</div>;

  return (
    <Accordion type="single" collapsible className="space-y-2">
      {rows.map((row) => (
        <AccordionItem key={row.id} value={`row-${row.id}`}>
          <AccordionTrigger className="flex gap-2 items-center">
            {iconFor(row.status)}
            <span className="mr-2 text-sm">
              {new Date(row.time).toLocaleString()}
            </span>
            <span className="flex-1 truncate">
              {row.initiator} ➝ {row.target}
            </span>
            <Badge
              variant={
                row.status === "accepted" || row.status === "staff"
                  ? "default"
                  : row.status === "rejected"
                  ? "destructive"
                  : "outline"
              }
            >
              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
            </Badge>
          </AccordionTrigger>

          <AccordionContent className="pl-7 py-2 text-sm text-muted-foreground">
            {row.assignment ? (
              <>
                <div className="mb-1">
                  <span className="font-medium">Assignment&nbsp;</span>
                  {row.assignment}
                </div>
                Swap initiated by <b>{row.initiator}</b> to replace&nbsp;
                <b>{row.previous}</b> with&nbsp;<b>{row.target}</b>.
              </>
            ) : (
              <>
                Swap initiated by <b>{row.initiator}</b> to replace with&nbsp;
                <b>{row.target}</b>.
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}