"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type HistoryRow = {
  swap_id: number;
  initiator: string;
  target: string;
  status: "pending" | "accepted" | "rejected";
  time: string;
  course_code: string;
};

export default function MySwapHistoryContent() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiClient
      .get("/swap/my/")
      .then((res) => {
        if (res.data.status === "success") {
          setRows(
            res.data.swaps.map((r: any) => ({
              swap_id: r.swap_id,
              initiator: r.role === "sender" ? "You" : r.initiator,
              target: r.role === "sender" ? r.with_ta_name : "You",
              status: r.status,
              time: r.time,
              course_code: r.course_code,
            }))
          );
        } else {
          setError(res.data.message || "Failed to load history.");
        }
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, []);

  const statusStyles = {
    accepted: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  const statusIcons = {
    accepted: <Check className="h-4 w-4 text-green-600" />,
    rejected: <X className="h-4 w-4 text-red-600" />,
    pending: <Clock className="h-4 w-4 text-yellow-600" />,
  };

  return (
    <Card className="rounded-lg shadow-lg">
      <CardHeader className="rounded-t-lg">
        <CardTitle className="text-blue-600">My Swap History</CardTitle>
        <CardDescription>All swaps you have participated in.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <div className="py-6 text-center">Loading…</div>}

        {error && (
          <Alert variant="destructive" className="rounded-lg mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="py-4 text-muted-foreground">No history.</div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.swap_id}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                {/* Status Icon */}
                <span className="flex items-center justify-center w-6 h-6">
                  {statusIcons[r.status]}
                </span>

                {/* Time */}
                <span className="w-[180px] text-sm">
                  {new Date(r.time).toLocaleString()}
                </span>

                {/* Course Code */}
                <span className="w-24 text-sm font-medium">{r.course_code}</span>

                {/* Swap Details */}
                <span className="flex-1 truncate">
                  {r.initiator} → {r.target}
                </span>

                {/* Status Badge */}
                <Badge
                  className={`${
                    statusStyles[r.status]
                  } capitalize px-2 py-1 rounded-lg`}
                >
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
