"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { useUser } from "@/components/general/user-data";
import TAWeeklySchedule from "@/components/general/schedule";
import AddExamModal from "@/app/proctoring/add-exam/page";
import MyExams from "@/components/general/my-exams";
import { AppSidebar } from "@/components/general/app-sidebar";

export default function HomePage() {
  // Shared user hook
  const { user, loading } = useUser();

  // Local state for exam modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [examRefreshTrigger, setExamRefreshTrigger] = useState(0);

  // If still loading user data, show a spinner
  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  // If user is null but not loading, likely means not authenticated
  if (!user) {
    return <div className="text-white">No user found</div>;
  }

  const handleExamModalClose = () => {
    setShowExamModal(false);
    setExamRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} /> {/* SIDEBAR */}

        <SidebarInset className="bg-gray-950 p-8">
          <div className="mb-4">
            <SidebarTrigger className="text-white" />
          </div>

          <div className="w-full">
            {/* Greetings Message */}
            <p className="mb-4 text-gray-300">
              Hi {user.name} {user.surname}, welcome to TA Management System! <br />
            </p>

            {/* If TA, show Weekly Schedule */}
            {user.isTA && <TAWeeklySchedule />}

            {/* If Staff, show Courses & Add Exam section */}
            {!user.isTA && user.courses && (
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
            {/* Add Exam section */}
            {!user.isTA && (
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

            {!user.isTA && (
              <MyExams refreshTrigger={examRefreshTrigger} />
            )}
          </div>
        </SidebarInset>

        {/* Show modal if user is Staff & wants to add exam */}
        {showExamModal && !user.isTA && (
          <AddExamModal onClose={handleExamModalClose} />
        )}
      </div>

    </SidebarProvider>
  );

}
