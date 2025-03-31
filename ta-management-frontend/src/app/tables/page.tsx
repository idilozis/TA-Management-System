"use client"

import { useState, useEffect } from "react"
import { Table2 } from "lucide-react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import apiClient from "@/lib/axiosClient"
import { DataTable } from "@/components/ui/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { courseColumns, taColumns, staffColumns, type CourseData, type TAData, type StaffData } from "./columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import MailPopover from "@/app/home-page/mail-system/MailPopover"
import { PageLoader } from "@/components/ui/loading-spinner"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type Tab = "courses" | "tas" | "staff"

export default function TablesPage() {
  const { user, loading } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>("courses")

  // State for each table data
  const [courses, setCourses] = useState<CourseData[]>([])
  const [tas, setTAs] = useState<TAData[]>([])
  const [staff, setStaff] = useState<StaffData[]>([])
  const [error, setError] = useState("")
  const [loadingData, setLoadingData] = useState(false)

  // Mail popover state
  const [mailOpen, setMailOpen] = useState(false)
  const [mailRole, setMailRole] = useState<"TA" | "Staff" | null>(null)
  const [mailEmail, setMailEmail] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true)
      setError("")

      try {
        if (activeTab === "courses") {
          const res = await apiClient.get("/list/courses/")
          if (res.data.status === "success") {
            setCourses(res.data.courses)
          } else {
            setError(res.data.message || "Error fetching courses.")
          }
        } else if (activeTab === "tas") {
          const res = await apiClient.get("/list/tas/")
          if (res.data.status === "success") {
            setTAs(res.data.tas)
          } else {
            setError(res.data.message || "Error fetching TAs.")
          }
        } else if (activeTab === "staff") {
          const res = await apiClient.get("/list/staff/")
          if (res.data.status === "success") {
            setStaff(res.data.staff)
          } else {
            setError(res.data.message || "Error fetching staff.")
          }
        }
      } catch (err: any) {
        setError("Error fetching data. Please try again.")
        console.error(err)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [activeTab])

  // Handle opening mail popover
  const handleOpenMail = (email: string, role: "TA" | "Staff") => {
    setMailEmail(email)
    setMailRole(role)
    setMailOpen(true)
  }

  // Handle mail popover close
  const handleMailClose = () => {
    setMailOpen(false)
    setMailRole(null)
    setMailEmail(null)
  }

  // If user data is still loading
  if (loading) {
    return <PageLoader />
  }

  // If no user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">No user found</div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <Table2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Tables</h1>
          </div>

          <Tabs
            defaultValue="courses"
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as Tab)}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="courses" className="cursor-pointer">Courses</TabsTrigger>
              <TabsTrigger value="tas" className="cursor-pointer">TAs</TabsTrigger>
              <TabsTrigger value="staff" className="cursor-pointer">Staff</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loadingData ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                <TabsContent value="courses">
                  <Card>
                    <CardHeader>
                      <CardTitle>Courses</CardTitle>
                      <CardDescription>List of all courses in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {courses.length === 0 ? (
                        <div className="text-center py-4">No courses found.</div>
                      ) : (
                        <DataTable columns={courseColumns} data={courses} searchPlaceholder="Search courses..." />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tas">
                  <Card>
                    <CardHeader>
                      <CardTitle>Teaching Assistants</CardTitle>
                      <CardDescription>List of all TAs in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tas.length === 0 ? (
                        <div className="text-center py-4">No TAs found.</div>
                      ) : (
                        <DataTable
                          columns={taColumns}
                          data={tas}
                          searchPlaceholder="Search TAs..."
                          handleOpenMail={handleOpenMail}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="staff">
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff</CardTitle>
                      <CardDescription>List of all staff members in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {staff.length === 0 ? (
                        <div className="text-center py-4">No staff found.</div>
                      ) : (
                        <DataTable
                          columns={staffColumns}
                          data={staff}
                          searchPlaceholder="Search staff..."
                          handleOpenMail={handleOpenMail}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
          {/* Mail Popover - without trigger button */}
          <MailPopover
            forceOpen={mailOpen}
            initialRole={mailRole}
            initialEmail={mailEmail}
            onClose={handleMailClose}
            hideButton={true}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

