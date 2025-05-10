// app/tables/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Archive, Plus } from "lucide-react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import apiClient from "@/lib/axiosClient"
import { DataTable } from "@/components/ui/data-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  useCourseColumns,
  useTAColumns,
  useStaffColumns,
  type CourseData,
  type TAData,
  type StaffData,
} from "./columns"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import MailPopover from "@/app/home-page/mail-system/MailPopover"
import { PageLoader, LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import CreateCourseModal from "./CreateCourseModal"
import CreateTAModal from "./CreateTAModal"
import CreateStaffModal from "./CreateStaffModal"

type Tab = "courses" | "tas" | "staff"

export default function TablesPage() {
  const { user, loading } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>("courses")

  // Table data state
  const [courses, setCourses] = useState<CourseData[]>([])
  const [tas, setTAs]         = useState<TAData[]>([])
  const [staff, setStaff]     = useState<StaffData[]>([])
  const [error, setError]     = useState("")
  const [loadingData, setLoadingData] = useState(false)

  // Mail popover state
  const [mailOpen, setMailOpen]   = useState(false)
  const [mailRole, setMailRole]   = useState<"TA" | "Staff" | null>(null)
  const [mailEmail, setMailEmail] = useState<string | null>(null)

  const handleOpenMail = (email: string, role: "TA" | "Staff") => {
    setMailEmail(email)
    setMailRole(role)
    setMailOpen(true)
  }
  const handleMailClose = () => {
    setMailOpen(false)
    setMailRole(null)
    setMailEmail(null)
  }

  // Create-modal state
  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [createTAOpen, setCreateTAOpen]         = useState(false)
  const [createStaffOpen, setCreateStaffOpen]   = useState(false)

  // Fetch function (used by columns hooks and effect)
  const fetchData = async () => {
    setLoadingData(true)
    setError("")
    try {
      if (activeTab === "courses") {
        const res = await apiClient.get("/list/courses/")
        if (res.data.status === "success") setCourses(res.data.courses)
        else setError(res.data.message || "Error fetching courses.")
      } else if (activeTab === "tas") {
        const res = await apiClient.get("/list/tas/")
        if (res.data.status === "success") setTAs(res.data.tas)
        else setError(res.data.message || "Error fetching TAs.")
      } else {
        const res = await apiClient.get("/list/staff/")
        if (res.data.status === "success") {
          // sort by department, then by (name + surname)
          const sorted = [...res.data.staff].sort((a, b) => {
            if (a.department === b.department) {
              // if same dept, compare full names
              const nameA = `${a.name} ${a.surname}`;
              const nameB = `${b.name} ${b.surname}`;
              return nameA.localeCompare(nameB);
            }
            return a.department.localeCompare(b.department);
          });
          setStaff(sorted);
        } else {
          setError(res.data.message || "Error fetching staff.");
        }
      }
    
    } catch {
      setError("Error fetching data. Please try again.")
    } finally {
      setLoadingData(false)
    }
  }

  // Column definitions (depend on fetchData and user)
  const courseColumns = useCourseColumns(fetchData)
  const taColumns     = useTAColumns(fetchData)
  const staffColumns  = useStaffColumns(fetchData)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  if (loading) return <PageLoader />
  if (!user)  return <div className="min-h-screen flex items-center justify-center">No user found</div>

  const canCreate = user.isAuth && user.role === "ADMIN"

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Archive className="h-8 w-8 text-blue-600" /> Records
            </h1>
          </div>

          <Tabs
            defaultValue="courses"
            value={activeTab}
            onValueChange={v => setActiveTab(v as Tab)}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="tas">TAs</TabsTrigger>
              <TabsTrigger value="staff">Instructors</TabsTrigger>
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
                {/* COURSES */}
                <TabsContent value="courses">
                  <Card className="border-black">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-blue-700">COURSES</CardTitle>
                      {canCreate && (
                        <Button
                          onClick={() => setCreateCourseOpen(true)}
                          size="sm"
                          className="w-auto max-w-max flex-none bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Create Course
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={courseColumns}
                        data={courses}
                        toolbarClassName="justify-start"
                        hideRowCount
                        tableClassName="text-sm"
                        searchPlaceholder="Search Courses..."
                      />
                    </CardContent>
                  </Card>
                  <CreateCourseModal
                    open={createCourseOpen}
                    onOpenChange={setCreateCourseOpen}
                    onSuccess={() => { setCreateCourseOpen(false); fetchData() }}
                    user={{
                      isAuth: Boolean(user.isAuth),
                      role:   user.role ?? "",
                    }}
                  />
                </TabsContent>

                {/* TAs */}
                <TabsContent value="tas">
                  <Card className="border-black">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-blue-700">TEACHING ASSISTANTS</CardTitle>
                      {canCreate && (
                        <Button
                          onClick={() => setCreateTAOpen(true)}
                          size="sm"
                          className="w-auto max-w-max flex-none bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Create TA
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={taColumns}
                        data={tas}
                        toolbarClassName="justify-start"
                        hideRowCount
                        tableClassName="text-sm"
                        searchPlaceholder="Search TAs..."
                        handleOpenMail={handleOpenMail}
                      />
                    </CardContent>
                  </Card>
                  <CreateTAModal
                    open={createTAOpen}
                    onOpenChange={setCreateTAOpen}
                    onSuccess={() => { setCreateTAOpen(false); fetchData() }}
                    user={{
                      isAuth: Boolean(user.isAuth),
                      role:   user.role ?? "",
                    }}
                  />
                </TabsContent>

                {/* STAFF */}
                <TabsContent value="staff">
                  <Card className="border-black">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-blue-700">INSTRUCTORS</CardTitle>
                      {canCreate && (
                        <Button
                          onClick={() => setCreateStaffOpen(true)}
                          size="sm"
                          className="w-auto max-w-max flex-none bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Create Instructor
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={staffColumns}
                        data={staff}
                        toolbarClassName="justify-start"
                        hideRowCount
                        tableClassName="text-sm"
                        searchPlaceholder="Search Instructors..."
                        handleOpenMail={handleOpenMail}
                      />
                    </CardContent>
                  </Card>
                  <CreateStaffModal
                    open={createStaffOpen}
                    onOpenChange={setCreateStaffOpen}
                    onSuccess={() => { setCreateStaffOpen(false); fetchData() }}
                    user={{
                      isAuth: Boolean(user.isAuth),
                      role:   user.role ?? "",
                    }}
                  />
                </TabsContent>
              </>
            )}

            {/* Mail Popover */}
            <MailPopover
              forceOpen={mailOpen}
              initialRole={mailRole}
              initialEmail={mailEmail}
              onClose={handleMailClose}
              hideButton
              hideSearchAndChoose
            />
          </Tabs>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
