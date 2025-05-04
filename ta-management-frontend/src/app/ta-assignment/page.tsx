"use client"

import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClipboardList, Info } from "lucide-react"
import apiClient from "@/lib/axiosClient"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertTriangle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Data interfaces
interface TA {
  name: string
  surname: string
  email: string
  is_full_time?: boolean
}

interface Course {
  code: string
  name: string
}

interface Staff {
  name: string
  surname: string
  email: string
}

interface AssignmentPreference {
  staff: Staff
  course: Course
  min_load: number
  max_load: number
  num_graders: number
  must_have_ta: TA[]
  preferred_tas: TA[]
  preferred_graders: TA[]
  avoided_tas: TA[]
}

interface TAAllocation {
  course: Course
  assigned_tas: TA[]
  assigned_graders: TA[]
  total_load: number
}

export default function TAAssignmentPage() {
  const { user, loading: userLoading } = useUser()
  const [preferences, setPreferences] = useState<AssignmentPreference[]>([])
  const [allocations, setAllocations] = useState<Record<string, TAAllocation>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"assignments" | "preferences">("assignments")

  // Dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null)
  const [currentPreference, setCurrentPreference] = useState<AssignmentPreference | null>(null)
  const [selectedTAs, setSelectedTAs] = useState<string[]>([])
  const [selectedGraders, setSelectedGraders] = useState<string[]>([])
  const [assignmentType, setAssignmentType] = useState<"tas" | "graders">("tas")
  const [submitting, setSubmitting] = useState(false)
  const [dialogError, setDialogError] = useState("")
  // Add the allTAs state and dialogSearchQuery state
  const [allTAs, setAllTAs] = useState<TA[]>([])
  const [dialogSearchQuery, setDialogSearchQuery] = useState("")

  // Add these new state variables near the other state declarations
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [pendingOverrideAction, setPendingOverrideAction] = useState(false)

  // Fetch data on component mount
  // Update the useEffect to fetch all TAs
  useEffect(() => {
    fetchData()
    fetchAllTAs()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    let useFallbackData = false

    try {
      // Fetch assignment preferences
      const response = await apiClient.get("/assignment/list-preferences/")

      if (response.data && response.data.status === "success" && response.data.assignments) {
        setPreferences(response.data.assignments)

        // Initialize allocations with empty arrays
        const newAllocations: Record<string, TAAllocation> = {}

        // For each course in the preferences, check if there are existing allocations
        for (const pref of response.data.assignments) {
          // Check if there are any TAs assigned to this course
          const taAllocation = {
            course: pref.course,
            assigned_tas: [],
            assigned_graders: [],
            total_load: 0,
          }

          // Look for existing allocations in the response data
          // This assumes the backend returns allocation data along with preferences
          // If not, we'll need to make a separate API call to get allocations

          newAllocations[pref.course.code] = taAllocation
        }

        // Now try to fetch existing allocations for each course
        try {
          // This would be a separate endpoint to get current allocations
          // If your backend doesn't have this endpoint, you'll need to add it
          const allocationsResponse = await apiClient.get("/assignment/list-allocations/")

          if (
            allocationsResponse.data &&
            allocationsResponse.data.status === "success" &&
            allocationsResponse.data.allocations
          ) {
            // Update the allocations with the data from the backend
            for (const allocation of allocationsResponse.data.allocations) {
              if (newAllocations[allocation.course.code]) {
                newAllocations[allocation.course.code] = {
                  ...newAllocations[allocation.course.code],
                  assigned_tas: allocation.assigned_tas || [],
                  assigned_graders: allocation.assigned_graders || [],
                  total_load: allocation.total_load || 0,
                }
              }
            }
          }
        } catch (allocErr) {
          console.warn("Could not fetch allocations:", allocErr)
          // Continue with empty allocations
        }

        setAllocations(newAllocations)
      } else {
        useFallbackData = true
      }
    } catch (apiError) {
      console.error("API error:", apiError)
      useFallbackData = true
    } finally {
      setLoading(false)
    }
  }

  // Add the fetchAllTAs function
  const fetchAllTAs = async () => {
    try {
      const res = await apiClient.get("/list/tas/")
      if (res.data && res.data.status === "success") {
        setAllTAs(res.data.tas || [])
      } else {
        console.error("Failed to fetch all TAs:", res.data?.message)
      }
    } catch (err) {
      console.error("Error fetching all TAs:", err)
    }
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    await fetchData()
    setIsRefreshing(false)
  }

  // Update the openAssignDialog function to reset the dialog search query
  const openAssignDialog = (course: Course, preference: AssignmentPreference, type: "tas" | "graders") => {
    setCurrentCourse(course)
    setCurrentPreference(preference)
    setAssignmentType(type)
    setDialogSearchQuery("")

    // Initialize selected TAs/graders based on current allocations
    if (allocations[course.code]) {
      if (type === "tas") {
        setSelectedTAs(allocations[course.code].assigned_tas.map((ta) => ta.email))
      } else {
        setSelectedGraders(allocations[course.code].assigned_graders.map((ta) => ta.email))
      }
    } else {
      setSelectedTAs([])
      setSelectedGraders([])
    }

    setAssignDialogOpen(true)
    setDialogError("")
  }

  // Update the handleAssign function to consider allTAs when calculating load
  const handleAssign = async (overrideMustHave = false) => {
    if (!currentCourse || !currentPreference) return

    setSubmitting(true)
    setDialogError("")

    try {
      // Calculate total load (only for TA assignments)
      let totalLoad = 0
      if (assignmentType === "tas") {
        selectedTAs.forEach((email) => {
          // First check in preference TAs
          const ta = [
            ...currentPreference.must_have_ta,
            ...currentPreference.preferred_tas,
            ...currentPreference.avoided_tas,
          ].find((t) => t.email === email)

          // If not found in preferences, check in all TAs
          const generalTA = !ta ? allTAs.find((t) => t.email === email) : null

          if ((ta && ta.is_full_time === false) || (generalTA && generalTA.is_full_time === false)) {
            totalLoad += 1
          } else {
            totalLoad += 2
          }
        })

        // Check boundaries before POSTing
        if (totalLoad > currentPreference.max_load) {
          setDialogError(`Total load (${totalLoad}) exceeds the maximum allowed (${currentPreference.max_load}).`)
          setSubmitting(false)
          return
        }

        // if (totalLoad < currentPreference.min_load) {
        //   setDialogError(`Total load (${totalLoad}) is below the minimum required (${currentPreference.min_load}).`)
        //   setSubmitting(false)
        //   return
        // }
      }

      const endpoint = assignmentType === "tas" ? "/assignment/assign-tas/" : "/assignment/assign-graders/"
      const payload =
        assignmentType === "tas"
          ? {
              course_code: currentCourse.code,
              assigned_tas: selectedTAs,
              ...(overrideMustHave && { force: true }),
            }
          : {
              course_code: currentCourse.code,
              assigned_graders: selectedGraders,
            }

      const response = await apiClient.post(endpoint, payload)

      // Backend returned soft warning
      if (response.status === 202 && response.data?.require_confirmation) {
        // Show custom confirmation dialog instead of browser confirm
        setConfirmationMessage(response.data.message)
        setShowConfirmationDialog(true)
        setPendingOverrideAction(true)
        setSubmitting(false)
        return
      }

      if (response.data && response.data.status === "success") {
        setAllocations((prev) => {
          const updated = { ...prev }

          if (!updated[currentCourse.code]) {
            updated[currentCourse.code] = {
              course: currentCourse,
              assigned_tas: [],
              assigned_graders: [],
              total_load: 0,
            }
          }

          if (assignmentType === "tas") {
            const assignedTAs = selectedTAs.map((email) => {
              // First check in preference TAs
              const prefTA = [
                ...currentPreference.must_have_ta,
                ...currentPreference.preferred_tas,
                ...currentPreference.avoided_tas,
              ].find((t) => t.email === email)

              // If not found in preferences, check in all TAs
              const generalTA = !prefTA ? allTAs.find((t) => t.email === email) : null

              return (
                prefTA ||
                generalTA || {
                  name: email.split("@")[0],
                  surname: "",
                  email,
                }
              )
            })

            updated[currentCourse.code].assigned_tas = assignedTAs
            updated[currentCourse.code].total_load = totalLoad
          } else {
            const assignedGraders = selectedGraders.map((email) => {
              // First check in preference graders
              const prefGrader = [
                ...currentPreference.preferred_graders,
                ...currentPreference.must_have_ta,
                ...currentPreference.preferred_tas,
              ].find((t) => t.email === email)

              // If not found in preferences, check in all TAs
              const generalTA = !prefGrader ? allTAs.find((t) => t.email === email) : null

              return (
                prefGrader ||
                generalTA || {
                  name: email.split("@")[0],
                  surname: "",
                  email,
                }
              )
            })

            updated[currentCourse.code].assigned_graders = assignedGraders
          }

          return updated
        })

        setSuccess(`${assignmentType === "tas" ? "TAs" : "Graders"} assigned successfully!`)
        setTimeout(() => setSuccess(""), 3000)
        setAssignDialogOpen(false)
      } else {
        setDialogError(response.data?.message || "Failed to assign. Please try again.")
      }
    } catch (err: any) {
      setDialogError(err.response?.data?.message || "Error assigning. Please try again.")
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Add these handler functions for the confirmation dialog
  const handleConfirmOverride = async () => {
    setShowConfirmationDialog(false)
    setPendingOverrideAction(false)

    // Call handleAssign again with override flag
    setSubmitting(true)
    await handleAssign(true)
  }

  const handleCancelOverride = () => {
    setShowConfirmationDialog(false)
    setPendingOverrideAction(false)
  }

  const handleToggleTA = (email: string) => {
    setSelectedTAs((prev) => {
      if (prev.includes(email)) {
        return prev.filter((e) => e !== email)
      } else {
        return [...prev, email]
      }
    })
  }

  const handleToggleGrader = (email: string) => {
    setSelectedGraders((prev) => {
      if (prev.includes(email)) {
        return prev.filter((e) => e !== email)
      } else {
        return [...prev, email]
      }
    })
  }

  const filteredPreferences = preferences.filter((pref) => {
    if (!searchQuery) return true

    const searchLower = searchQuery.toLowerCase()
    return (
      pref.course.code.toLowerCase().includes(searchLower) ||
      pref.course.name.toLowerCase().includes(searchLower) ||
      pref.staff.name.toLowerCase().includes(searchLower) ||
      pref.staff.surname.toLowerCase().includes(searchLower)
    )
  })

  // Filter TAs in the dialog based on search query
  // Add the getFilteredTAs function
  const getFilteredTAs = () => {
    if (!dialogSearchQuery) return allTAs

    const query = dialogSearchQuery.toLowerCase()
    return allTAs.filter(
      (ta) =>
        ta.name.toLowerCase().includes(query) ||
        ta.surname.toLowerCase().includes(query) ||
        ta.email.toLowerCase().includes(query),
    )
  }

  // Check if a TA is already in one of the preference categories
  // Add the isInPreferenceCategories function
  const isInPreferenceCategories = (email: string) => {
    if (!currentPreference) return false

    return [
      ...currentPreference.must_have_ta,
      ...currentPreference.preferred_tas,
      ...currentPreference.avoided_tas,
      // ...currentPreference.preferred_graders,
    ].some((ta) => ta.email === email)
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
            <ClipboardList className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">TA Assignment</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center mb-6">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Tabs defaultValue="assignments" value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="mb-6">
              <TabsTrigger
                value="assignments"
                className={activeTab === "assignments" ? "" : "text-blue-600"}
              >
                Current Assignments
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className={activeTab === "preferences" ? "" : "text-blue-600"}
              >
                Assignment Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-blue-600">Course Assignments</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span>Legend</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="w-[280px] bg-white border-2 text-black">
                          <div className="space-y-2 p-1">
                            <p className="font-medium">Color Legend</p>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-100 border border-blue-300"></div>
                                <span className="text-xs">Must-Have TA</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 border border-green-400"></div>
                                <span className="text-xs">Preferred TA</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-100 border border-purple-300"></div>
                                <span className="text-xs">Preferred Grader</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-100 border border-red-300"></div>
                                <span className="text-xs">Avoided TA</span>
                              </div>
                              <p className="text-xs">Loads Info</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Full-Time TA = 2 Loads</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Part-Time TA = 1 Load</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Graders = 1 Load</span>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription>Manage TA and grader assignments for each course</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Course</TableHead>
                          <TableHead className="font-semibold">Instructor</TableHead>
                          <TableHead className="font-semibold">Load Constraints</TableHead>
                          <TableHead className="font-semibold">Assigned TAs</TableHead>
                          <TableHead className="font-semibold">Assigned Graders</TableHead>
                          <TableHead className="font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPreferences.map((pref) => {
                          const allocation = allocations[pref.course.code] || {
                            course: pref.course,
                            assigned_tas: [],
                            assigned_graders: [],
                            total_load: 0,
                          }

                          const isUnderLoaded = allocation.total_load < pref.min_load
                          const isOverLoaded = allocation.total_load > pref.max_load

                          // Check if all must-have TAs are assigned
                          const mustHaveEmails = pref.must_have_ta.map((ta) => ta.email)
                          const assignedEmails = allocation.assigned_tas.map((ta) => ta.email)
                          const allMustHaveAssigned = mustHaveEmails.every((email) => assignedEmails.includes(email))

                          return (
                            <TableRow key={`${pref.course.code}-${pref.staff.email}`}>
                              <TableCell className="font-medium">
                                <div>{pref.course.code}</div>
                                <div className="text-sm text-muted-foreground">{pref.course.name}</div>
                              </TableCell>
                              <TableCell>
                                {pref.staff.name} {pref.staff.surname}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>Min: {pref.min_load}</span>
                                  <span>Max: {pref.max_load}</span>
                                  <span>Current: {allocation.total_load}</span>
                                  {isUnderLoaded && (
                                    <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 border-red-200">
                                      Under-loaded
                                    </Badge>
                                  )}
                                  {isOverLoaded && (
                                    <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 border-red-200">
                                      Over-loaded
                                    </Badge>
                                  )}
                                  {!allMustHaveAssigned && mustHaveEmails.length > 0 && (
                                    <Badge variant="outline" className="ml-2 bg-red-100 text-red-800 border-red-200">
                                      Missing must-have TAs
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {allocation.assigned_tas.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {allocation.assigned_tas.map((ta) => (
                                      <TooltipProvider key={ta.email}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge
                                              variant="outline"
                                              className={`
                                                ${mustHaveEmails.includes(ta.email) ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"} 
                                                cursor-help
                                              `}
                                            >
                                              {ta.name} {ta.surname}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{ta.email}</p>
                                            {mustHaveEmails.includes(ta.email) && (
                                              <p className="text-blue-600 font-medium">Must-have TA</p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No TAs assigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {allocation.assigned_graders.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {allocation.assigned_graders.map((ta) => (
                                      <TooltipProvider key={ta.email}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge
                                              variant="outline"
                                              className="bg-purple-100 text-purple-800 cursor-help"
                                            >
                                              {ta.name} {ta.surname}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{ta.email}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No graders assigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAssignDialog(pref.course, pref, "tas")}
                                  >
                                    Assign TAs
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAssignDialog(pref.course, pref, "graders")}
                                  >
                                    Assign Graders
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-blue-600">Assignment Preferences</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span>Legend</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="w-[280px] bg-white border-2 text-black">
                          <div className="space-y-2 p-1">
                            <p className="font-medium">Color Legend</p>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-100 border border-blue-300"></div>
                                <span className="text-xs">Must-Have TA</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 border border-green-400"></div>
                                <span className="text-xs">Preferred TA</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-100 border border-purple-300"></div>
                                <span className="text-xs">Preferred Grader</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-red-100 border border-red-300"></div>
                                <span className="text-xs">Avoided TA</span>
                              </div>
                              <p className="text-xs">Loads Info</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Full-Time TA = 2 Loads</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Part-Time TA = 1 Load</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Graders = 1 Load</span>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription>View instructor preferences for TA assignments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-semibold">Course</TableHead>
                          <TableHead className="font-semibold">Instructor</TableHead>
                          <TableHead className="font-semibold">Load Constraints</TableHead>
                          <TableHead className="font-semibold">Must-Have TAs</TableHead>
                          <TableHead className="font-semibold">Preferred TAs</TableHead>
                          <TableHead className="font-semibold">Preferred Graders</TableHead>
                          <TableHead className="font-semibold">Avoided TAs</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPreferences.map((pref) => (
                          <TableRow key={`${pref.course.code}-${pref.staff.email}`}>
                            <TableCell className="font-medium">
                              <div>{pref.course.code}</div>
                              <div className="text-sm text-muted-foreground">{pref.course.name}</div>
                            </TableCell>
                            <TableCell>
                              {pref.staff.name} {pref.staff.surname}
                            </TableCell>
                            <TableCell>
                              <div>Min: {pref.min_load}</div>
                              <div>Max: {pref.max_load}</div>
                              <div>Graders: {pref.num_graders}</div>
                            </TableCell>
                            <TableCell>
                              {pref.must_have_ta.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pref.must_have_ta.map((ta) => (
                                    <Badge key={ta.email} variant="outline" className="bg-blue-100 text-blue-800">
                                      {ta.name} {ta.surname}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pref.preferred_tas.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pref.preferred_tas.map((ta) => (
                                    <Badge key={ta.email} variant="outline" className="bg-green-100 text-green-800">
                                      {ta.name} {ta.surname}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pref.preferred_graders.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pref.preferred_graders.map((ta) => (
                                    <Badge key={ta.email} variant="outline" className="bg-purple-100 text-purple-800">
                                      {ta.name} {ta.surname}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {pref.avoided_tas.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {pref.avoided_tas.map((ta) => (
                                    <Badge key={ta.email} variant="outline" className="bg-red-100 text-red-800">
                                      {ta.name} {ta.surname}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SidebarInset>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {assignmentType === "tas" ? "Assign TAs" : "Assign Graders"} to {currentCourse?.code}
            </DialogTitle>
          </DialogHeader>

          {dialogError && (
            <Alert variant="destructive">
              <AlertDescription>{dialogError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 py-4">
            {currentPreference && (
              <>
                {assignmentType === "tas" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Must-Have TAs</Label>
                      <div className="space-y-2">
                        {currentPreference.must_have_ta.length > 0 ? (
                          currentPreference.must_have_ta.map((ta) => (
                            <div key={ta.email} className="flex items-center space-x-2">
                              <Checkbox
                                id={`must-have-${ta.email}`}
                                checked={selectedTAs.includes(ta.email)}
                                onCheckedChange={() => handleToggleTA(ta.email)}
                              />
                              <Label htmlFor={`must-have-${ta.email}`} className="flex items-center gap-2">
                                {ta.name} {ta.surname}
                                <Badge className="ml-2 bg-blue-100 text-blue-800">Must-Have</Badge>
                                <Badge className="ml-1 bg-gray-100 text-gray-800">
                                  {ta.is_full_time === false ? "PT (1)" : "FT (2)"}
                                </Badge>
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">No must-have TAs for this course</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium">Preferred TAs</Label>
                      <div className="space-y-2">
                        {currentPreference.preferred_tas.length > 0 ? (
                          currentPreference.preferred_tas.map((ta) => (
                            <div key={ta.email} className="flex items-center space-x-2">
                              <Checkbox
                                id={`preferred-${ta.email}`}
                                checked={selectedTAs.includes(ta.email)}
                                onCheckedChange={() => handleToggleTA(ta.email)}
                              />
                              <Label htmlFor={`preferred-${ta.email}`} className="flex items-center gap-2">
                                {ta.name} {ta.surname}
                                <Badge className="ml-1 bg-gray-100 text-gray-800">
                                  {ta.is_full_time === false ? "PT (1)" : "FT (2)"}
                                </Badge>
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">No preferred TAs for this course</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-medium text-red-600">Avoided TAs</Label>
                      <div className="space-y-2">
                        {currentPreference.avoided_tas.length > 0 ? (
                          currentPreference.avoided_tas.map((ta) => (
                            <div key={ta.email} className="flex items-center space-x-2">
                              <Checkbox
                                id={`avoided-${ta.email}`}
                                checked={selectedTAs.includes(ta.email)}
                                onCheckedChange={() => handleToggleTA(ta.email)}
                              />
                              <Label htmlFor={`avoided-${ta.email}`} className="flex items-center gap-2">
                                {ta.name} {ta.surname}
                                <Badge className="ml-2 bg-red-100 text-red-800">Avoided</Badge>
                                <Badge className="ml-1 bg-gray-100 text-gray-800">
                                  {ta.is_full_time === false ? "PT (1)" : "FT (2)"}
                                </Badge>
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">No avoided TAs for this course</div>
                        )}
                      </div>
                    </div>

                    {/* All TAs section */}
                    <div className="space-y-2">
                      <Label className="font-medium">All TAs</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search TAs..."
                          value={dialogSearchQuery}
                          onChange={(e) => setDialogSearchQuery(e.target.value)}
                          className="pl-8 mb-2"
                        />
                      </div>
                      <ScrollArea className="h-[200px] border rounded-md p-2">
                        <div className="space-y-2">
                          {getFilteredTAs()
                            .filter((ta) => !isInPreferenceCategories(ta.email))
                            .map((ta) => (
                              <div key={ta.email} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`all-ta-${ta.email}`}
                                  checked={selectedTAs.includes(ta.email)}
                                  onCheckedChange={() => handleToggleTA(ta.email)}
                                />
                                <Label htmlFor={`all-ta-${ta.email}`} className="flex items-center gap-2">
                                  {ta.name} {ta.surname}
                                  <Badge className="ml-1 bg-gray-100 text-gray-800">
                                    {ta.is_full_time === false ? "PT (1)" : "FT (2)"}
                                  </Badge>
                                </Label>
                              </div>
                            ))}
                          {getFilteredTAs().filter((ta) => !isInPreferenceCategories(ta.email)).length === 0 && (
                            <div className="text-muted-foreground py-2 text-center">
                              {dialogSearchQuery ? "No matching TAs found" : "No additional TAs available"}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="rounded-md bg-blue-50 p-3 text-blue-800 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <Info className="h-4 w-4" />
                        Load Constraints
                      </div>
                      <div className="mt-1">
                        <div>Min Load: {currentPreference.min_load}</div>
                        <div>Max Load: {currentPreference.max_load}</div>
                        <div>Current Selection: {selectedTAs.length} TAs</div>
                        <div>
                          Estimated Total Load:{" "}
                          {selectedTAs.reduce((total, email) => {
                            // First check in preference TAs
                            const ta = [
                              ...currentPreference.must_have_ta,
                              ...currentPreference.preferred_tas,
                              ...currentPreference.avoided_tas,
                            ].find((t) => t.email === email)

                            // If not found in preferences, check in all TAs
                            const generalTA = !ta ? allTAs.find((t) => t.email === email) : null

                            return (
                              total +
                              ((ta && ta.is_full_time === false) || (generalTA && generalTA.is_full_time === false)
                                ? 1
                                : 2)
                            )
                          }, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {assignmentType === "graders" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Preferred Graders</Label>
                      <div className="space-y-2">
                        {currentPreference.preferred_graders.length > 0 ? (
                          currentPreference.preferred_graders.map((ta) => (
                            <div key={ta.email} className="flex items-center space-x-2">
                              <Checkbox
                                id={`grader-${ta.email}`}
                                checked={selectedGraders.includes(ta.email)}
                                onCheckedChange={() => handleToggleGrader(ta.email)}
                              />
                              <Label htmlFor={`grader-${ta.email}`}>
                                {ta.name} {ta.surname}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground">No preferred graders for this course</div>
                        )}
                      </div>
                    </div>

                    {/* All TAs section for graders (including Other TAs) */}
                    <div className="space-y-2">
                      <Label className="font-medium">All TAs</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search TAs..."
                          value={dialogSearchQuery}
                          onChange={(e) => setDialogSearchQuery(e.target.value)}
                          className="pl-8 mb-2"
                        />
                      </div>
                      <ScrollArea className="h-[200px] border rounded-md p-2">
                        <div className="space-y-2">
                          {/* First show the "Other TAs" (must-have and preferred TAs) */}
                          {[...currentPreference.must_have_ta, ...currentPreference.preferred_tas]
                            .filter(
                              (ta) =>
                                !currentPreference.preferred_graders.some((g) => g.email === ta.email) &&
                                (!dialogSearchQuery ||
                                  ta.name.toLowerCase().includes(dialogSearchQuery.toLowerCase()) ||
                                  ta.surname.toLowerCase().includes(dialogSearchQuery.toLowerCase()) ||
                                  ta.email.toLowerCase().includes(dialogSearchQuery.toLowerCase())),
                            )
                            .map((ta) => (
                              <div key={ta.email} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`other-${ta.email}`}
                                  checked={selectedGraders.includes(ta.email)}
                                  onCheckedChange={() => handleToggleGrader(ta.email)}
                                />
                                <Label htmlFor={`other-${ta.email}`} className="flex items-center gap-2">
                                  {ta.name} {ta.surname}
                                  <Badge className="ml-2 bg-blue-100 text-blue-800">Course TA</Badge>
                                </Label>
                              </div>
                            ))}

                          {/* Then show all other TAs not in any preference category */}
                          {getFilteredTAs()
                            .filter(
                              (ta) =>
                                !currentPreference.preferred_graders.some((g) => g.email === ta.email) &&
                                ![...currentPreference.must_have_ta, ...currentPreference.preferred_tas].some(
                                  (t) => t.email === ta.email,
                                ),
                            )
                            .map((ta) => (
                              <div key={ta.email} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`all-grader-${ta.email}`}
                                  checked={selectedGraders.includes(ta.email)}
                                  onCheckedChange={() => handleToggleGrader(ta.email)}
                                />
                                <Label htmlFor={`all-grader-${ta.email}`}>
                                  {ta.name} {ta.surname}
                                </Label>
                              </div>
                            ))}

                          {/* Show message if no TAs are found */}
                          {getFilteredTAs().filter(
                            (ta) => !currentPreference.preferred_graders.some((g) => g.email === ta.email),
                          ).length === 0 &&
                            [...currentPreference.must_have_ta, ...currentPreference.preferred_tas].filter(
                              (ta) => !currentPreference.preferred_graders.some((g) => g.email === ta.email),
                            ).length === 0 && (
                              <div className="text-muted-foreground py-2 text-center">
                                {dialogSearchQuery ? "No matching TAs found" : "No additional TAs available"}
                              </div>
                            )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="rounded-md bg-purple-50 p-3 text-purple-800 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <Info className="h-4 w-4" />
                        Grader Information
                      </div>
                      <div className="mt-1">
                        <div>Number of Graders Needed: {currentPreference.num_graders}</div>
                        <div>Current Selection: {selectedGraders.length} Graders</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleAssign()} disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="sm:max-w-md bg-white text-black">
          <DialogHeader>
            <DialogTitle>Confirmation Required</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{confirmationMessage}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelOverride} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmOverride} disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
              {submitting ? "Confirm" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Must-Have TAs */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent className="sm:max-w-md bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Warning: Missing Must-Have TAs</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive" className="bg-amber-50 text-amber-800 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{confirmationMessage}</AlertDescription>
            </Alert>

            <p className="mt-4 text-sm">
              The instructor has specified certain TAs as "must-have" for this course. Are you sure you want to proceed
              with this assignment without including all required TAs?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelOverride}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmOverride}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              Proceed Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
