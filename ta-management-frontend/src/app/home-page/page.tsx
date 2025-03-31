"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/components/general/user-data";
import TAWeeklySchedule from "@/components/general/schedule";
import AddExamModal from "@/app/proctoring/add-exam/page";
import MyExams from "@/app/proctoring/my-exams/my-exams";
import { AppSidebar } from "@/components/general/app-sidebar";
import { FileText } from "lucide-react";

export default function HomePage() {
  // Shared user hook
  const { user, loading } = useUser();

  // Local state for exam modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [examRefreshTrigger, setExamRefreshTrigger] = useState(0);

  // If still loading user data, show a spinner
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        Loading...
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        No user found.
      </div>
    );

  const handleExamModalClose = () => {
    setShowExamModal(false);
    setExamRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />

        <SidebarInset className="bg-white p-8">
          <div className="mb-4">
            <SidebarTrigger className="text-gray-900" />
          </div>

          {/* Greetings Section */}
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-blue-800 mb-1">
                  Hello, {user.name} {user.surname}!
                </h2>
                <p className="text-blue-700">
                  This is the home page of the TA Management System. Let's take a look at your tasks for today.
                </p>
              </div>
              {/* Welcome icon */}
              <img
                src="/welcome.png"
                alt="Welcome Illustration"
                className="w-38 h-auto md:mr-8"
              />
            </div>
          </div>

          {/* If TA, show Weekly Schedule */}
          {user.isTA && <TAWeeklySchedule />}

          {/* If Staff, show Courses & Add Exam section */}
          {!user.isTA && user.courses && (
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

          {/* Add Exam section */}
          {!user.isTA && (
            <div className="mb-3 mt-8 flex items-center justify-between">
              <h2 className="flex items-center text-xl font-semibold">
                <FileText className="mr-2 h-6 w-6 text-blue-600" />
                MY EXAMS
              </h2>
              <button
                onClick={() => setShowExamModal(true)}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
              >
                Add Exam
              </button>
            </div>
          )}

          {!user.isTA && <MyExams refreshTrigger={examRefreshTrigger} />}
        </SidebarInset>
      </div>

      {/* Show modal if user is Staff & wants to add exam */}
      {showExamModal && !user.isTA && <AddExamModal onClose={handleExamModalClose} />}
    </SidebarProvider>
  );

}
