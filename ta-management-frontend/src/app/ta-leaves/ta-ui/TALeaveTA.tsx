"use client"

import { useState, useEffect } from "react"
import apiClient from "@/lib/axiosClient"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { CalendarOff, Paperclip, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

interface TALeave {
  id: number
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

// Form validation schema
const leaveFormSchema = z.object({
  leave_type: z.string().min(1, { message: "Please select a leave type" }),
  start_date: z.string().min(1, { message: "Please select a start date" }),
  end_date: z.string().min(1, { message: "Please select an end date" }),
  start_time: z.string().min(1, { message: "Please select a start time" }),
  end_time: z.string().min(1, { message: "Please select an end time" }),
  description: z.string().min(1, { message: "Please provide a description" }),
})

type LeaveFormValues = z.infer<typeof leaveFormSchema>

function computeTotalDays(start_date: string, end_date: string): string {
  const start = new Date(start_date)
  const end = new Date(end_date)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
  return `${diffDays} day(s)`
}

export default function TALeaveTA() {
  const { user, loading } = useUser()
  const [myLeaves, setMyLeaves] = useState<TALeave[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("error")
  const [activeTab, setActiveTab] = useState("pending")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState("")
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split('-')
    return `${day}.${month}.${year}`
  }

  // Initialize form
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leave_type: "",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      description: "",
    },
  })

  useEffect(() => {
    if (user && user.isTA) {
      fetchMyLeaves()
    }
  }, [user])

  const fetchMyLeaves = async () => {
    setMessage("")
    try {
      const res = await apiClient.get("/taleave/my-leaves/")
      if (res.data.status === "success") {
        setMyLeaves(res.data.leaves)
      } else {
        setMessage(res.data.message || "Error fetching leave requests.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching leave requests.")
      setMessageType("error")
    }
  }

  const onSubmit = async (data: LeaveFormValues) => {
    setMessage("")
    const formData = new FormData()
    formData.append("leave_type", data.leave_type)
    formData.append("start_date", data.start_date)
    formData.append("end_date", data.end_date)
    formData.append("start_time", data.start_time)
    formData.append("end_time", data.end_time)
    formData.append("description", data.description)

    if (selectedFile) {
      formData.append("document", selectedFile)
    }

    try {
      const res = await apiClient.post("/taleave/create-leave/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      if (res.data.status === "success") {
        setMessage("Leave request created successfully!")
        setMessageType("success")
        fetchMyLeaves()
        // Reset form
        form.reset()
        setSelectedFile(null)
        setSelectedFileName("")
        // Close modal
        setShowCreateModal(false)
      } else {
        setMessage(res.data.message || "Error creating leave request.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error creating leave request.")
      setMessageType("error")
    }
  }

  // Handle cancel button click
  const handleCancel = () => {
    form.reset()
    setSelectedFile(null)
    setSelectedFileName("")
    setShowCreateModal(false)
  }

  // Handle file selection
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file)
    setSelectedFileName(file ? file.name : "")
  }

  if (loading) return <PageLoader />
  if (!user) return <div>No user found.</div>
  if (!user.isTA) return <div>Only TAs can access this page.</div>

  // Separate leaves into pending vs. past
  const pendingLeaves = myLeaves.filter((lv) => lv.status.toLowerCase() === "pending")
  const pastLeaves = myLeaves.filter((lv) => lv.status.toLowerCase() !== "pending")

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <CalendarOff className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Leave Requests</h1>
      </div>

      {message && (
        <Alert variant={messageType === "success" ? "default" : "destructive"} className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Leaves Tables */}
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
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-blue-600">Pending Leave Requests</CardTitle>
                <CardDescription>Leave requests awaiting approval.</CardDescription>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="mr-0.5 h-4 w-4" /> New Leave Request
              </Button>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pending leave requests.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {pendingLeaves.map((leave) => (
                        <TableRow key={leave.id}>
                          <TableCell className="font-medium capitalize">{leave.leave_type}</TableCell>
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
                          <TableCell className="max-w-[200px] truncate">{leave.description}</TableCell>
                          <TableCell>
                            {leave.document_url ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/taleave/leaves/${leave.id}/download-document/`}
                                className="inline-flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <Paperclip className="h-4 w-4 mr-1" />
                                <span>Download</span>
                              </a>
                            ) : (
                              "N/A"
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

        <TabsContent value="past">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-blue-600">Past Leave Requests</CardTitle>
                <CardDescription>History of approved and rejected leave requests.</CardDescription>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="mr-0.5 h-4 w-4" /> New Leave Request
              </Button>
            </CardHeader>
            <CardContent>
              {pastLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No past leave requests.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                          <TableCell className="font-medium capitalize">{leave.leave_type}</TableCell>
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
                          <TableCell className="max-w-[200px] truncate">{leave.description}</TableCell>
                          <TableCell>
                            {leave.document_url ? (
                              <a
                                href={`${process.env.NEXT_PUBLIC_API_URL}/taleave/leaves/${leave.id}/download-document/`}
                                className="inline-flex items-center text-blue-600 hover:text-blue-800"
                              >
                                <Paperclip className="h-4 w-4 mr-1" />
                                <span>Download</span>
                              </a>
                            ) : (
                              "N/A"
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

      {/* Create Leave Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
            <Card className="border-blue-600 border-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-blue-600">Create Leave Request</CardTitle>
                </div>
                <CardDescription>Submit a new leave request for approval.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Leave Type */}
                      <FormField
                        control={form.control}
                        name="leave_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leave Type <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select leave type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="medical">Medical</SelectItem>
                                <SelectItem value="conference">Conference</SelectItem>
                                <SelectItem value="vacation">Vacation</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Document Upload */}
                      <div className="space-y-2">
                        <FormLabel>Document (Optional)</FormLabel>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("document-upload")?.click()}
                            className="flex items-center"
                          >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Select File
                          </Button>
                          <input
                            type="file"
                            id="document-upload"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleFileSelect(e.target.files[0])
                              }
                            }}
                            accept=".pdf,image/*"
                            className="hidden"
                          />
                          {selectedFileName && (
                            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                              <span className="text-sm text-blue-700">{selectedFileName}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upload any medical report or document (PDF or image).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Start Date */}
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="w-full" min = {new Date().toISOString().split("T")[0]}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* End Date */}
                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="w-full" min = {new Date().toISOString().split("T")[0]}/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Start Time */}
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className="w-full"/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* End Time */}
                      <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className="w-full"/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Provide details about your leave request."
                              {...field}
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>
                            Explain the reason for your leave request and any other relevant details.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                        Submit Request
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}