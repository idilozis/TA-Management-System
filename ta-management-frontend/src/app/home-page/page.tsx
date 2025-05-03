"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useUser } from "@/components/general/user-data"
import { AppSidebar } from "@/components/general/app-sidebar"
import { FileText, Plus } from "lucide-react"
import { PageLoader } from "@/components/ui/loading-spinner"
import WeeklyScheduleModal from "@/app/home-page/ta-schedule/WeeklyScheduleModal"
import AddExamModal from "@/app/exams/add-exam/AddExamModal"
import StaffExamsModal from "@/app/exams/staff-exams/StaffExamsModal"
import MailPopover from "@/app/home-page/mail-system/MailPopover"
import NotificationModal from "@/app/home-page/notification-system/NotificationPopover"
import { Button } from "@/components/ui/button"

const TopWorkloadChart = dynamic(
  () => import("@/components/charts/TopWorkloadChart").then((m) => m.TopWorkloadChart),
  { ssr: false }
)
const DeptComparisonChart = dynamic(
  () =>
    import("@/components/charts/DepartmentComparisonChart").then(
      (m) => m.DepartmentComparisonChart
    ),
  { ssr: false }
)

export default function HomePage() {
  // Shared user hook
  const { user, loading } = useUser()

  // State for mail popover
  const [mailOpen, setMailOpen] = useState(false)
  const [mailRole, setMailRole] = useState<"TA" | "Staff" | null>(null)
  const [mailEmail, setMailEmail] = useState<string | null>(null)

  // State for exam modal
  const [showExamModal, setShowExamModal] = useState(false)
  const [examRefreshTrigger, setExamRefreshTrigger] = useState(0)

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mailParam = params.get("mail")
    const roleParam = (params.get("role") as "TA" | "Staff") || null
    const emailParam = params.get("email")

    if (mailParam === "true" && roleParam && emailParam) {
      setMailOpen(true)
      setMailRole(roleParam)
      setMailEmail(emailParam)
    }
  }, [])

  // Loading states
  if (loading) return <PageLoader />
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        No user found.
      </div>
    )

  // Handlers
  const handleMailClose = () => {
    setMailOpen(false)
    setMailRole(null)
    setMailEmail(null)

    // Clean URL
    const url = new URL(window.location.href)
    url.searchParams.delete("mail")
    url.searchParams.delete("role")
    url.searchParams.delete("email")
    window.history.replaceState({}, "", url.toString())
  }

  const handleExamModalClose = () => {
    setShowExamModal(false)
    setExamRefreshTrigger((prev) => prev + 1)
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />

        <SidebarInset className="bg-white p-8 relative">
          <div className="mb-4 flex justify-between items-center">
            <SidebarTrigger className="text-gray-900" />
            <div className="flex items-center space-x-4">
              <MailPopover
                forceOpen={mailOpen}
                initialRole={mailRole}
                initialEmail={mailEmail}
                onClose={handleMailClose}
              />
              <NotificationModal />
            </div>
          </div>

          {/* Greetings */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-blue-800 mb-1">
                  Hello, {user.name} {user.surname}!
                </h2>
                <p className="text-blue-700">
                  This is the home page of the TA Management System. Let's take a look
                  at your tasks for today.
                </p>
              </div>
              <img
                src="/welcome.png"
                alt="Welcome Illustration"
                className="w-38 h-auto md:mr-8"
              />
            </div>
          </div>

          {/* TA Schedule */}
          {user.isTA && <WeeklyScheduleModal />}

          {/* Staff: Given Courses */}
          {!user.isTA && !user.isAuth && user.courses && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-3">Given Courses:</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {user.courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 border border-gray-300 bg-gray-50 rounded shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-800">{course.code}</h4>
                    <p className="text-gray-600">{course.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff: Exams */}
          {!user.isTA && !user.isAuth && (
            <>
              <div className="mb-3 mt-8 flex items-center justify-between">
                <h2 className="flex items-center text-xl font-semibold">
                  <FileText className="mr-2 h-6 w-6 text-blue-600" /> MY EXAMS
                </h2>
                <Button
                  onClick={() => setShowExamModal(true)}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="mr-0.5 h-4 w-4" />
                  Exam
                </Button>
              </div>
              <StaffExamsModal refreshTrigger={examRefreshTrigger} />
            </>
          )}

          {/* Authorized Staff: Charts */}
          {!user.isTA && user.isAuth && (
            <section className="mt-12 grid gap-6 md:grid-cols-2">
              <div>
                <TopWorkloadChart />
              </div>
              <div>
                <DeptComparisonChart />
              </div>
            </section>
          )}
        </SidebarInset>
      </div>

      {/* Add Exam Modal */}
      {showExamModal && !user.isTA && !user.isAuth && (
        <AddExamModal onClose={handleExamModalClose} />
      )}
    </SidebarProvider>
  )
}
