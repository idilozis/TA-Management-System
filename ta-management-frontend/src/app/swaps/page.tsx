"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Repeat } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import MySwapHistoryContent from "./MySwapHistoryModal";

interface SwapRow {
  swap_id: number;
  role: "sender" | "receiver";
  status: string;
  with_ta_name: string;
  course_code: string;
  course_name: string;
  date: string;
  start_time: string;
  end_time: string;
  classrooms: string[];
  student_count: number;
}

export default function SwapsPage() {
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<SwapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSwaps = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/swap/my/");
      if (data.status === "success") {
        setRows(data.swaps as SwapRow[]);
        setError("");
      } else {
        setError(data.message || "Failed to fetch swaps.");
      }
    } catch {
      setError("Network error.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSwaps();
  }, []);

  if (userLoading || loading) return <PageLoader />;

  const pending = rows.filter(r => r.role === "sender" && r.status === "pending");
  const incoming = rows.filter(r => r.role === "receiver" && r.status === "pending");

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />

        <SidebarInset className="bg-white p-8 w-full">
          <div className="flex items-center gap-2 mb-6">
            <Repeat className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Swaps</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="pending">
            <TabsList className="mb-6">
              <TabsTrigger value="pending">Pending Swaps</TabsTrigger>
              <TabsTrigger value="requests">Incoming Requests</TabsTrigger>
              <TabsTrigger value="history">My Swap History</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Pending Swaps</CardTitle>
                  <CardDescription>Swap requests you have sent.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SwapsTable data={pending} empty="No pending swaps." />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Swap Requests</CardTitle>
                  <CardDescription>Requests sent to you by other TAs.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SwapsTable data={incoming} empty="No swap requests." />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <MySwapHistoryContent />
            </TabsContent>
          </Tabs>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SwapsTable({
  data,
  empty,
}: {
  data: SwapRow[];
  empty: string;
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {empty}
      </div>
    );
  }

  const respond = async (id: number, decision: "accept" | "reject") => {
    try {
      await apiClient.post(`/swap/respond/${id}/`, { decision });
      window.location.reload();
    } catch {
      alert("Swap update failed");
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Classroom</TableHead>
            <TableHead>Students</TableHead>
            <TableHead>With</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(r => (
            <TableRow key={r.swap_id}>
              <TableCell className="font-medium">
                <div>{r.course_code}</div>
                {r.course_name && (
                  <div className="text-sm text-muted-foreground">
                    {r.course_name}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  {r.date.split("-").reverse().join(".")}
                </Badge>
              </TableCell>
              <TableCell>
                {r.start_time} – {r.end_time}
              </TableCell>
              <TableCell>{r.classrooms.join(", ")}</TableCell>
              <TableCell>{r.student_count}</TableCell>
              <TableCell>{r.with_ta_name}</TableCell>
              <TableCell className="capitalize">
                {r.role === "receiver" && r.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button
                      className="bg-blue-600 hover:bg-blue-500"
                      size="sm"
                      onClick={() => respond(r.swap_id, "accept")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => respond(r.swap_id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  r.status
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
