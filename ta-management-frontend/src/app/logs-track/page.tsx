"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { useUser } from "@/components/general/user-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { PageLoader } from "@/components/ui/loading-spinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AuthLog {
  user: string;
  action: "login" | "logout";
  when: string;
  ip: string;
  agent: string;
}

export default function LoginTrackPage() {
  const { user, loading: userLoading } = useUser();
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "login" | "logout">("all");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/auth/logs/");
      if (data.status === "success") {
        // map user_email → user
        const mapped: AuthLog[] = data.logs.map((l: any) => ({
          user:  l.user_email,
          action:l.action,
          when:  l.when,
          ip:    l.ip,
          agent: l.agent,
        }));
        setLogs(mapped);
        setError(null);
      } else {
        setError(data.message || "Could not load logs.");
      }
    } catch {
      setError("Network or server error while loading logs.");
    } finally {
      setLoading(false);
    }
  };

  // once we have a user, fetch the logs
  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

  // show loader until user + logs are ready
  if (userLoading || loading) return <PageLoader />;

  // guard: if for some reason no user, don't render
  if (!user) return null;

  // filter by tab
  const filtered = logs.filter((l) =>
    tab === "all" ? true : l.action === tab
  );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />

        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Authentication Audit</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as any)}
            className="mb-6"
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="login">Logins</TabsTrigger>
              <TabsTrigger value="logout">Logouts</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <Card>
                <CardHeader className="flex justify-between">
                  <div>
                    <CardTitle>Events</CardTitle>
                    <CardDescription>
                      Showing {tab === "all" ? "all events" : tab}
                    </CardDescription>
                  </div>
                  <button
                    onClick={fetchLogs}
                    className="px-3 py-1 border rounded hover:bg-gray-100"
                  >
                    Refresh
                  </button>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      No {tab === "all" ? "authentication events" : `${tab}s`} found.
                    </p>
                  ) : (
                    <div className="overflow-auto rounded border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>When</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>User Agent</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((l, i) => (
                            <TableRow key={i} className="hover:bg-muted/50">
                              <TableCell>{l.user}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    l.action === "login"
                                      ? "border-green-200 text-green-800"
                                      : "border-red-200 text-red-800"
                                  }
                                >
                                  {l.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(l.when).toLocaleString()}
                              </TableCell>
                              <TableCell>{l.ip}</TableCell>
                              <TableCell className="whitespace-nowrap overflow-hidden text-ellipsis">
                                {l.agent}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
