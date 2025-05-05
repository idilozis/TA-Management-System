"use client"

import { useState, useEffect } from "react"
import apiClient from "@/lib/axiosClient"
import { useUser } from "@/components/general/user-data"
import { CalendarOff, FileDown } from "lucide-react"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface StaffLeave {
  id: number
  ta_email: string
  ta_name: string
  leave_type: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  description: string
  status: string
  created_at?: string
  document_url?: string | null
}

export default function TALeaveAuthorized() {
  const { user, loading } = useUser()
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("error")
  const [pendingLeaves, setPendingLeaves] = useState<StaffLeave[]>([])
  const [pastLeaves, setPastLeaves] = useState<StaffLeave[]>([])
  const [activeTab, setActiveTab] = useState("pending")

  // Format date from ISO to DD.MM.YYYY
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split("-")
    return `${day}.${month}.${year}`
  }

  // Compute total days between two dates
  function computeTotalDays(start_date: string, end_date: string): string {
    const start = new Date(start_date)
    const end = new Date(end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
    return `${diffDays} day(s)`
  }

  useEffect(() => {
    if (user && !user.isTA) {
      fetchPendingLeaves()
      fetchPastLeaves()
    }
  }, [user])

  const fetchPendingLeaves = async () => {
    try {
      const res = await apiClient.get("/taleave/pending-leaves/")
      if (res.data.status === "success") {
        setPendingLeaves(res.data.leaves)
      } else {
        setMessage(res.data.message || "Error fetching pending leaves.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching pending leaves.")
      setMessageType("error")
    }
  }

  const fetchPastLeaves = async () => {
    try {
      const res = await apiClient.get("/taleave/past-leaves/")
      if (res.data.status === "success") {
        setPastLeaves(res.data.leaves)
      } else {
        setMessage(res.data.message || "Error fetching past leaves.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching past leaves.")
      setMessageType("error")
    }
  }

  const handleUpdateLeaveStatus = async (leaveId: number, newStatus: string) => {
    setMessage("")
    try {
      const res = await apiClient.post(`/taleave/leaves/${leaveId}/update-status/`, {
        status: newStatus,
      })
      if (res.data.status === "success") {
        setMessage(`Leave request ${newStatus} successfully.`)
        setMessageType("success")
        fetchPendingLeaves()
        fetchPastLeaves()
      } else {
        setMessage(res.data.message || "Error updating leave request.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error updating leave request.")
      setMessageType("error")
    }
  }

  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>
  if (user.isTA)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        Only staff can access this page.
      </div>
    )

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarOff className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Leave Requests</h1>
      </div>

      {message && (
        <Alert
          variant={messageType === "success" ? "default" : "destructive"}
          className={`mb-6 ${
            messageType === "success"
              ? "text-green-500 bg-green-100 border-green-200"
              : "bg-red-100 text-red-800 border-red-200"
          }`}
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Leave Requests Tables */}
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="text-blue-600 font-medium">
            Pending Leave Requests
          </TabsTrigger>
          <TabsTrigger value="past" className="text-blue-600 font-medium">
            Past Leave Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-600">Pending Leave Requests</CardTitle>
              <CardDescription>Leave requests awaiting your approval or rejection.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pending leave requests.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TA Name</TableHead>
                        <TableHead>TA Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingLeaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium">{leave.ta_name}</TableCell>
                          <TableCell>{leave.ta_email}</TableCell>
                          <TableCell>{leave.leave_type}</TableCell>
                          <TableCell>
                            {formatDate(leave.start_date)} ({leave.start_time})
                          </TableCell>
                          <TableCell>
                            {formatDate(leave.end_date)} ({leave.end_time})
                          </TableCell>
                          <TableCell>{computeTotalDays(leave.start_date, leave.end_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{leave.description || "-"}</TableCell>
                          <TableCell>
                            {leave.document_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                asChild
                              >
                                <a href={`http://localhost:8000/taleave/leaves/${leave.id}/download-document/`}>
                                  <FileDown className="h-4 w-4" />
                                  <span>Download</span>
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdateLeaveStatus(leave.id, "approved")}
                                className="bg-blue-600 hover:bg-green-500 text-white"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateLeaveStatus(leave.id, "rejected")}
                                className="bg-red-600 hover:bg-red-500 text-white"
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
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-600">Past Leave Requests</CardTitle>
              <CardDescription>History of approved and rejected leave requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {pastLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No past leave requests.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>TA Name</TableHead>
                        <TableHead>TA Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Document</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastLeaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium">{leave.ta_name}</TableCell>
                          <TableCell>{leave.ta_email}</TableCell>
                          <TableCell>{leave.leave_type}</TableCell>
                          <TableCell>
                            {formatDate(leave.start_date)} ({leave.start_time})
                          </TableCell>
                          <TableCell>
                            {formatDate(leave.end_date)} ({leave.end_time})
                          </TableCell>
                          <TableCell>{computeTotalDays(leave.start_date, leave.end_date)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                leave.status.toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }
                            >
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{leave.description || "-"}</TableCell>
                          <TableCell>
                            {leave.document_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                asChild
                              >
                                <a href={`http://localhost:8000/taleave/leaves/${leave.id}/download-document/`}>
                                  <FileDown className="h-4 w-4" />
                                  <span>Download</span>
                                </a>
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
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
    </div>
  )
}
