"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

import SettingsModal from "@/components/general/settings"
import type { UserData } from "@/components/general/settings"
import TAWeeklySchedule from "@/components/general/schedule"
import AddExamModal from "@/app/proctoring/add-exam/page"
import MyExams from "@/components/general/my-exams";
import { AppSidebar } from "@/components/app-sidebar"

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showExamModal, setShowExamModal] = useState(false)
  const [examRefreshTrigger, setExamRefreshTrigger] = useState(0)

  useEffect(() => {
    apiClient
      .get("/auth/whoami/")
      .then((response) => {
        if (response.data.status === "success") {
          const userData = response.data.user
          setUser(userData)

          if (!userData.isTA) {
            apiClient.get("/proctoring/list-courses/").then((coursesRes) => {
              if (coursesRes.data.status === "success") {
                setUser((prevUser) => ({
                  ...prevUser!,
                  courses: coursesRes.data.courses,
                }))
              }
            })
          }
        }
      })
      .catch(() => {
        setTimeout(() => router.push("/login"), 1000)
      })
  }, [router])

  const handleExamModalClose = () => {
    setShowExamModal(false)
    setExamRefreshTrigger((prev) => prev + 1)
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} onSettingsClick={() => setShowSettings(true)} />

        <SidebarInset className="bg-gray-950 p-8">
          <div className="mb-4">
            <SidebarTrigger className="text-white" />
          </div>
          <div className="w-full">
            {user && (
              <p className="mb-4 text-gray-300">
                Hi {user.name}, you are logged in as {user.email}. <br />
              </p>
            )}

            {/* If TA, show schedule */}
            {user && user.isTA && <TAWeeklySchedule />}

            {/* If Staff, show courses + exam section */}
            {user && !user.isTA && user.courses && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Your Courses:</h3>
                <ul className="ml-6 list-disc text-gray-200">
                  {user.courses.map((course) => (
                    <li key={course.id}>
                      {course.code} - {course.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user && !user.isTA && (
              <div className="mb-4 mt-8 flex items-center justify-between">
                <h2 className="text-xl font-semibold">MY EXAMS</h2>
                <button
                  onClick={() => setShowExamModal(true)}
                  className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500"
                >
                  Add Exam
                </button>
              </div>
            )}

            {user && !user.isTA && <MyExams refreshTrigger={examRefreshTrigger} />}
          </div>
        </SidebarInset>

        {showSettings && user && (
          <SettingsModal
            user={user}
            onClose={() => setShowSettings(false)}
            onUpdateUser={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {showExamModal && user && !user.isTA && <AddExamModal onClose={handleExamModalClose} />}
      </div>
    </SidebarProvider>
  )
}

