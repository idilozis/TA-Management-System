"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import apiClient from "@/lib/axiosClient"
import { ClipboardList, Plus } from "lucide-react"
import { PageLoader } from "@/components/ui/loading-spinner"
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
import { motion } from "framer-motion"

// Data interfaces
interface Course {
  id: number
  code: string
  name: string
}

interface Duty {
  id: number
  course: string | null // This holds the course CODE from the backend
  duty_type: string
  date: string
  start_time: string
  end_time: string
  duration_hours: number // decimal hours (e.g. 2.98)
  status: string // "Pending", "Approved", or "Rejected"
  description: string
}

// Form validation schema
const dutyFormSchema = z.object({
  duty_type: z.string().min(1, { message: "Please select a task type" }),
  date: z.string().min(1, { message: "Please select a date" }),
  start_time: z.string().min(1, { message: "Please select a start time" }),
  end_time: z.string().min(1, { message: "Please select an end time" }),
  course_code: z.string().min(1, { message: "Please select a course" }),
  description: z.string().optional(),
})

type DutyFormValues = z.infer<typeof dutyFormSchema>

export default function TADutiesPage() {
  const { user, loading } = useUser()
  const [duties, setDuties] = useState<Duty[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error">("error")
  const [activeTab, setActiveTab] = useState("pending")
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Initialize form
  const form = useForm<DutyFormValues>({
    resolver: zodResolver(dutyFormSchema),
    defaultValues: {
      duty_type: "",
      date: "",
      start_time: "",
      end_time: "",
      course_code: "",
      description: "",
    },
  })

  // Helper: convert decimal hours to "Hh Mm"
  function formatDuration(durationInHours: number): string {
    const totalMinutes = Math.round(durationInHours * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes}m`
  }

  // Helper: format duty type for display
  function formatDutyType(dutyType: string): string {
    return dutyType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Fetch TA's existing duties
  const fetchDuties = async () => {
    try {
      const res = await apiClient.get("/taduties/my-duties/")
      if (res.data.status === "success") {
        setDuties(res.data.duties)
      } else {
        setMessage(res.data.message || "Error fetching duties.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching duties.")
      setMessageType("error")
    }
  }

  // Fetch all courses for the dropdown
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get("/list/courses/")
      if (res.data.status === "success") {
        setCourses(res.data.courses)
      } else {
        setMessage(res.data.message || "Error fetching courses.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error fetching courses.")
      setMessageType("error")
    }
  }

  // On mount (and once user is known), fetch duties if TA, and fetch courses
  useEffect(() => {
    if (user && user.isTA) {
      fetchDuties()
      fetchCourses()
    }
  }, [user])

  // Submit handler for creating a new duty
  const onSubmit = async (data: DutyFormValues) => {
    setMessage("")
    try {
      const res = await apiClient.post("/taduties/create-duty/", data)
      if (res.data.status === "success") {
        setMessage("Duty created successfully!")
        setMessageType("success")
        fetchDuties()
        // Reset form
        form.reset()
        // Close modal
        setShowCreateModal(false)
      } else {
        setMessage(res.data.message || "Error creating duty.")
        setMessageType("error")
      }
    } catch {
      setMessage("Error creating duty.")
      setMessageType("error")
    }
  }

  // Handle cancel button click
  const handleCancel = () => {
    form.reset()
    setShowCreateModal(false)
  }

  // Loading and error messages
  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>
  if (!user.isTA)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">Only TAs can access this page.</div>
    )

  // Separate duties into pending vs. past
  const pendingDuties = duties.filter((d) => d.status === "Pending")
  const pastDuties = duties.filter((d) => d.status !== "Pending")

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">My Duties</h1>
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

          {/* Duties Tables */}
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
                    <CardTitle className="text-blue-600">Pending Requests</CardTitle>
                    <CardDescription>Duties awaiting approval from instructors</CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 ">
                    <Plus className="mr-0.5 h-4 w-4" />Create New Duty
                  </Button>
                </CardHeader>
                <CardContent>
                  {pendingDuties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No pending requests.</div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
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
                          {pendingDuties.map((duty) => (
                            <TableRow key={duty.id}>
                              <TableCell className="font-medium">{duty.course || "N/A"}</TableCell>
                              <TableCell>{formatDutyType(duty.duty_type)}</TableCell>
                              <TableCell>{duty.date}</TableCell>
                              <TableCell>
                                {duty.start_time} - {duty.end_time}
                              </TableCell>
                              <TableCell>{formatDuration(duty.duration_hours)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  {duty.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{duty.description || "-"}</TableCell>
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
                    <CardTitle className="text-blue-600">Past Requests</CardTitle>
                    <CardDescription>History of approved and rejected duties</CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Create New Duty
                  </Button>
                </CardHeader>
                <CardContent>
                  {pastDuties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No past requests.</div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
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
                          {pastDuties.map((duty) => (
                            <TableRow key={duty.id}>
                              <TableCell className="font-medium">{duty.course || "N/A"}</TableCell>
                              <TableCell>{formatDutyType(duty.duty_type)}</TableCell>
                              <TableCell>{duty.date}</TableCell>
                              <TableCell>
                                {duty.start_time} - {duty.end_time}
                              </TableCell>
                              <TableCell>{formatDuration(duty.duration_hours)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    duty.status === "Approved"
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : "bg-red-100 text-red-800 border-red-200"
                                  }
                                >
                                  {duty.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{duty.description || "-"}</TableCell>
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

      {/* Create Duty Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl mx-4"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-blue-600 border-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-blue-600">Create New Task</CardTitle>
                </div>
                <CardDescription>Submit a new duty request for approval</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Duty Type */}
                      <FormField
                        control={form.control}
                        name="duty_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select task type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="lab">Lab</SelectItem>
                                <SelectItem value="grading">Grading</SelectItem>
                                <SelectItem value="recitation">Recitation</SelectItem>
                                <SelectItem value="office_hours">Office Hours</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Course */}
                      <FormField
                        control={form.control}
                        name="course_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Course</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select course" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {courses.map((course) => (
                                  <SelectItem key={course.id} value={course.code}>
                                    {course.code} - {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Date */}
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="w-36" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Start Time */}
                      <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className="w-30" />
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
                            <FormLabel>End Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} className="w-30" />
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Optional description of the task" {...field} />
                          </FormControl>
                          <FormDescription>Provide any additional details about this duty</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                        Send Request
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </SidebarProvider>
  )
}
