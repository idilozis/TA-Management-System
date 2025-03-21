"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import Link from "next/link";
import { HomeIcon, ChartBarIcon } from "@heroicons/react/24/outline";

import SettingsModal from "@/components/general/settings";
import TAWeeklySchedule from "@/components/general/schedule";
import AddExamModal from "@/app/proctoring/add-exam";
import MyExams from "@/app/proctoring/my-exams";

interface UserData {
  name: string;
  surname?: string; // TAs
  email: string;
  isTA: boolean;
  program?: string; // TAs
  advisor?: string; // TAs
  department?: string; // Staff
}

const getRoleString = (user: UserData) => {
  if (user.isTA) {
    return (
      <>
        Teaching Assistant ({user.program}) <br />
        Your Advisor: {user.advisor}
      </>
    );
  } else {
    return (
      <>
        Staff of {user.department}
      </>
    );
  }
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examRefreshTrigger, setExamRefreshTrigger] = useState(0);

  useEffect(() => {
    apiClient
      .get("/auth/whoami/")
      .then((response) => {
        if (response.data.status === "success") {
          setUser(response.data.user);
        }
      })
      .catch((error) => {
        console.error("Not authenticated or error:", error);
        setTimeout(() => router.push("/login"), 1000);
      });
  }, [router]);

  // Close the exam modal and refresh the MyExams component
  const handleExamModalClose = () => {
    setShowExamModal(false);
    setExamRefreshTrigger(prev => prev + 1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        
        {/* Sidebar */}
        <Sidebar className="w-64 bg-pink-200 p-6 shadow-md">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/blank-profile-icon.png"
              alt="Profile"
              className="w-16 h-16 rounded-full mb-3"
            />

            <h3 className="text-lg font-semibold">
              {user ? `${user.name} ${user.surname || ""}` : "Loading..."}
            </h3>

            <p className="text-sm text-gray-700">
              {user ? getRoleString(user) : ""}
            </p>

            <button
              onClick={() => setShowSettings(true)}
              className="mt-4 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              Update Info
            </button>
          </div>

          <nav className="flex flex-col space-y-4">
            
            <Link
              href="/ta-duties"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <HomeIcon className="h-6 w-6 text-red-500" />
              <span className="ml-3 text-lg">TA Duties</span>
            </Link>

            <Link
              href="/reports"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <ChartBarIcon className="h-6 w-6 text-purple-800" />
              <span className="ml-3 text-lg">Reports</span>
            </Link>
          </nav>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">TA Management System Home Page</h1>
            {user && (
              <p className="mb-4">
                Hi {user.name}, you are logged in as {user.email}. <br />
                <strong>{getRoleString(user)}</strong>.
              </p>
            )}
            <p className="mb-6">
              Use the sidebar to navigate between TA Duties, Proctoring, and Reports.
            </p>

            {/* If user is a TA, show schedule */}
            {user && user.isTA && (
              <TAWeeklySchedule />
            )}
            
            {user && !user.isTA && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">MY EXAMS</h2>
              <button
                onClick={() => setShowExamModal(true)}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Add Exam
              </button>
            </div>
            )}

            {/* If user is staff, show their exams */}
            {user && !user.isTA && (
              <MyExams refreshTrigger={examRefreshTrigger} />
            )}

          </div>
        </main>

        {showSettings && user && (
          <SettingsModal
            user={user}
            onClose={() => setShowSettings(false)}
            onUpdateUser={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {showExamModal && user && !user.isTA && (
          <AddExamModal
            onClose={handleExamModalClose}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
