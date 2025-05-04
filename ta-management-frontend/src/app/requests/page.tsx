"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import apiClient from "@/lib/axiosClient"
import { Inbox, CheckCircle, XCircle, Clock } from "lucide-react"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Data interface for a duty
interface Duty {
  id: number
  ta_email: string
  ta_name: string
  course: string | null // course code
  duty_type: string
  date: string
  start_time: string
  end_time: string
  duration_hours: number
  status: string // "Pending", "Approved", or "Rejected"
  description: string
}

export default function RequestsPage() {
  const { user, loading } = useUser()
  const [pendingRequests, setPendingRequests] = useState<Duty[]>([])
  const [pastRequests, setPastRequests] = useState<Duty[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("error")
  const [activeTab, setActiveTab] = useState("pending")

  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split("-")
    return `${day}.${month}.${year}`
  }

  // Helper: format duty type for display
  function formatDutyType(dutyType: string): string {
    return dutyType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // If user is staff (not a TA), fetch pending/past requests
  useEffect(() => {
    if (user && !user.isTA) {
      fetchPendingRequests()
      fetchPastRequests()
    }
  }, [user])

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/pending-requests/")
      if (res.data.status === "success") {
        setPendingRequests(res.data.duties)
      } else {
        setMessage(res.data.message || "Error fetching pending requests.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching pending requests.")
      setMessageType("error")
    }
  }

  // Fetch past requests (approved or rejected)
  const fetchPastRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/past-requests/")
      if (res.data.status === "success") {
        setPastRequests(res.data.duties)
      } else {
        setMessage(res.data.message || "Error fetching past requests.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching past requests.")
      setMessageType("error")
    }
  }

  // Approve/Reject handler
  const updateDutyStatus = async (dutyId: number, newStatus: string) => {
    try {
      const res = await apiClient.post(`/taduties/${dutyId}/update-status/`, {
        status: newStatus,
      })
      if (res.data.status === "success") {
        setMessage(`Duty ${newStatus} successfully.`)
        setMessageType("success")
        // Refresh both lists
        fetchPendingRequests()
        fetchPastRequests()
      } else {
        setMessage(res.data.message || "Error updating duty status.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error updating duty status.")
      setMessageType("error")
    }
  }

  // Format decimal hours into "Hh Mm" (e.g., 2.98 → "2h 59m")
  function formatDuration(durationInHours: number): string {
    const totalMinutes = Math.round(durationInHours * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  // Loading and error messages
  if (loading) return <PageLoader />

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>
  if (user.isTA)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        Only staff can access this page.
      </div>
    )

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">TA Duty Requests</h1>
          </div>

          {message && (
            <Alert variant={messageType === "success" ? "default" : "destructive"} className="mb-6">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending" className="text-blue-600 font-medium">
                Pending Requests
              </TabsTrigger>
              <TabsTrigger value="past" className="text-blue-600 font-medium">
                Past Requests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Pending Requests</CardTitle>
                  <CardDescription>Review and manage pending duty requests from TAs</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No pending requests.</div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>TA</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingRequests.map((duty) => (
                            <TableRow key={duty.id}>
                              <TableCell>
                                <div className="font-medium">{duty.ta_name}</div>
                                <div className="text-xs text-muted-foreground">{duty.ta_email}</div>
                              </TableCell>
                              <TableCell>{duty.course || "N/A"}</TableCell>
                              <TableCell>{formatDutyType(duty.duty_type)}</TableCell>
                              <TableCell>{formatDate(duty.date)}</TableCell>
                              <TableCell>
                                {duty.start_time} - {duty.end_time}
                              </TableCell>
                              <TableCell>{formatDuration(duty.duration_hours)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {duty.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="text-left truncate max-w-[200px] block">
                                      {duty.description || "-"}
                                    </TooltipTrigger>
                                    {duty.description && (
                                      <TooltipContent side="top" className="max-w-md">
                                        <p>{duty.description}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-500"
                                    onClick={() => updateDutyStatus(duty.id, "approved")}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateDutyStatus(duty.id, "rejected")}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Reject
                                  </Button>
                                </div>
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

            <TabsContent value="past">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Past Requests</CardTitle>
                  <CardDescription>History of approved and rejected duty requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {pastRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No past requests.</div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>TA</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastRequests.map((duty) => (
                            <TableRow key={duty.id}>
                              <TableCell>
                                <div className="font-medium">{duty.ta_name}</div>
                                <div className="text-xs text-muted-foreground">{duty.ta_email}</div>
                              </TableCell>
                              <TableCell>{duty.course || "N/A"}</TableCell>
                              <TableCell>{formatDutyType(duty.duty_type)}</TableCell>
                              <TableCell>{formatDate(duty.date)}</TableCell>
                              <TableCell>
                                {duty.start_time} - {duty.end_time}
                              </TableCell>
                              <TableCell>{formatDuration(duty.duration_hours)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    duty.status.toLowerCase() === "approved"
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : "bg-red-100 text-red-800 border-red-200"
                                  }
                                >
                                  {duty.status.toLowerCase() === "approved" ? (
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                  ) : (
                                    <XCircle className="mr-1 h-3 w-3" />
                                  )}
                                  {duty.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="text-left truncate max-w-[200px] block">
                                      {duty.description || "-"}
                                    </TooltipTrigger>
                                    {duty.description && (
                                      <TooltipContent side="top" className="max-w-md">
                                        <p>{duty.description}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
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
  )
}
