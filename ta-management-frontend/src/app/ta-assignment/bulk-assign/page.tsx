"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import apiClient from "@/lib/axiosClient"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Data interfaces
interface TA {
  id: number
  name: string
  email: string
  ta_type?: string // "FT" or "PT"
}

interface Course {
  id: number
  code: string
  name: string
  section: number
  student_count: number
  min_tas_required: number
}

// Assignment types with their display names and colors
const ASSIGNMENT_TYPES = {
  none: { label: "Not Assigned", color: "bg-white" },
  load_1: { label: "1 Load", color: "bg-green-100" },
  load_2: { label: "2 Loads / Must-Have", color: "bg-green-300" },
  asked: { label: "TA Asked For", color: "bg-green-200" },
  non_cs: { label: "Non-CS TA", color: "bg-blue-100" },
  only_allowed: { label: "Only Allowed", color: "bg-yellow-100" },
  unqualified: { label: "Unqualified", color: "bg-yellow-200" },
  to_avoid: { label: "To Be Avoided", color: "bg-red-300" },
}

export default function BulkAssignPage() {
  const { user, loading: userLoading } = useUser()
  const [courses, setCourses] = useState<Course[]>([])
  const [tas, setTAs] = useState<TA[]>([])
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedTAs, setSelectedTAs] = useState<number[]>([])
  const [assignmentType, setAssignmentType] = useState<string>("load_1")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch TAs
        const tasResponse = await apiClient.get("/tassignment/list/tas/")
        if (tasResponse.data.status === "success") {
          setTAs(tasResponse.data.tas)
        } else {
          setError("Failed to load TAs")
        }

        // Fetch courses
        const coursesResponse = await apiClient.get("/tassignment/list/courses/")
        if (coursesResponse.data.status === "success") {
          setCourses(coursesResponse.data.courses)
        } else {
          setError("Failed to load courses")
        }
      } catch (err) {
        setError("Error loading data. Please try again.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user && !user.isTA) {
      fetchData()
    }
  }, [user])

  const handleToggleCourse = (courseId: number) => {
    setSelectedCourses((prev) => (prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]))
  }

  const handleToggleTA = (taId: number) => {
    setSelectedTAs((prev) => (prev.includes(taId) ? prev.filter((id) => id !== taId) : [...prev, taId]))
  }

  const handleSelectAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([])
    } else {
      setSelectedCourses(courses.map((course) => course.id))
    }
  }

  const handleSelectAllTAs = () => {
    if (selectedTAs.length === tas.length) {
      setSelectedTAs([])
    } else {
      setSelectedTAs(tas.map((ta) => ta.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedCourses.length === 0 || selectedTAs.length === 0) {
      setError("Please select at least one course and one TA")
      return
    }

    try {
      setSubmitting(true)
      setError("")
      setSuccess("")

      const response = await apiClient.post("/tassignment/bulk-update/", {
        section_ids: selectedCourses,
        ta_ids: selectedTAs,
        assignment_type: assignmentType,
      })

      if (response.data.status === "success") {
        setSuccess("Assignments updated successfully!")
        setTimeout(() => {
          router.push("/ta-assignment")
        }, 2000)
      } else {
        setError(response.data.message || "Failed to update assignments")
      }
    } catch (err) {
      setError("Error updating assignments. Please try again.")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (userLoading || loading) {
    return <PageLoader />
  }

  // Access control - only staff can access
  if (user?.isTA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Only staff members can access the TA assignment page.</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Bulk TA Assignment</h1>
          </div>

          <Link href="/ta-assignment">
            <Button variant="outline" className="mb-6 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Assignment Matrix
            </Button>
          </Link>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Bulk Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="courses">
                <TabsList className="mb-6">
                  <TabsTrigger value="courses">Step 1: Select Courses</TabsTrigger>
                  <TabsTrigger value="tas">Step 2: Select TAs</TabsTrigger>
                  <TabsTrigger value="type">Step 3: Assignment Type</TabsTrigger>
                </TabsList>

                <TabsContent value="courses">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Select Courses</h3>
                      <Button variant="outline" size="sm" onClick={handleSelectAllCourses}>
                        {selectedCourses.length === courses.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>

                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Min TAs Required</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {courses.map((course) => (
                            <TableRow key={course.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedCourses.includes(course.id)}
                                  onCheckedChange={() => handleToggleCourse(course.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {course.code} - {course.name}
                              </TableCell>
                              <TableCell>{course.section}</TableCell>
                              <TableCell>{course.student_count}</TableCell>
                              <TableCell>{course.min_tas_required}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Selected {selectedCourses.length} of {courses.length} courses
                        </p>
                      </div>
                      <Button
                          variant="outline"
                          onClick={() => {
                            const element = document.querySelector('[value="type"]');
                            if (element instanceof HTMLElement) {
                              element.click();
                            }
                          }}
                        >
                        Next: Select TAs
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tas">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Select TAs</h3>
                      <Button variant="outline" size="sm" onClick={handleSelectAllTAs}>
                        {selectedTAs.length === tas.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>

                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tas.map((ta) => (
                            <TableRow key={ta.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedTAs.includes(ta.id)}
                                  onCheckedChange={() => handleToggleTA(ta.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{ta.name}</TableCell>
                              <TableCell>{ta.email}</TableCell>
                              <TableCell>{ta.ta_type || "FT"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Selected {selectedTAs.length} of {tas.length} TAs
                        </p>
                      </div>
                      <div className="space-x-2">
                      <Button
                          variant="outline"
                          onClick={() => {
                            const element = document.querySelector('[value="courses"]');
                            if (element instanceof HTMLElement) {
                              element.click();
                            }
                          }}
                        >
                          Back: Select Courses
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const element = document.querySelector('[value="type"]');
                            if (element instanceof HTMLElement) {
                              element.click();
                            }
                          }}
                        >
                          Next: Assignment Type
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="type">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Select Assignment Type</h3>

                    <div className="border rounded-md p-4">
                      <RadioGroup value={assignmentType} onValueChange={setAssignmentType}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(ASSIGNMENT_TYPES).map(([value, { label, color }]) => (
                            <div key={value} className="flex items-center space-x-2">
                              <RadioGroupItem value={value} id={`option-${value}`} />
                              <Label htmlFor={`option-${value}`} className="flex items-center">
                                <div className={`w-4 h-4 mr-2 ${color} border border-gray-300`}></div>
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Summary</h4>
                      <p className="text-blue-700">
                        You are about to assign <strong>{selectedTAs.length} TAs</strong> to{" "}
                        <strong>{selectedCourses.length} courses</strong> with assignment type:{" "}
                        <strong>{ASSIGNMENT_TYPES[assignmentType as keyof typeof ASSIGNMENT_TYPES].label}</strong>
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        This will create {selectedCourses.length * selectedTAs.length} assignments in total.
                      </p>
                    </div>

                    <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const element = document.querySelector('[value="type"]');
                        if (element instanceof HTMLElement) {
                          element.click();
                        }
                      }}
                    >
                        Back: Select TAs
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || selectedCourses.length === 0 || selectedTAs.length === 0}
                        className="bg-blue-600 hover:bg-blue-500"
                      >
                        {submitting ? "Processing..." : "Apply Assignments"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
