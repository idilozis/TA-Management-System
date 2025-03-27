"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  CheckCircle,
  UserRound,
  Settings as SettingsIcon,
} from "lucide-react";

import SettingsModal from "@/components/general/settings";
import type { UserData } from "@/components/general/settings";
import TAWeeklySchedule from "@/components/general/schedule";
import AddExamModal from "@/app/proctoring/add-exam";
import MyExams from "@/app/proctoring/my-exams";

const getRoleString = (user: UserData) => {
  if (user.isTA) {
    return (
      <>
        {/* Teaching Assistant ({user.program}) <br />
        Your Advisor: {user.advisor} */}
      </>
    );
  } else {
    return <>Staff of {user.department}</>;
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
          const userData = response.data.user;
          setUser(userData);

          if (!userData.isTA) {
            apiClient.get("/proctoring/list-courses/").then((coursesRes) => {
              if (coursesRes.data.status === "success") {
                setUser((prevUser) => ({
                  ...prevUser!,
                  courses: coursesRes.data.courses,
                }));
              }
            });
          }
        }
      })
      .catch(() => {
        setTimeout(() => router.push("/login"), 1000);
      });
  }, [router]);

  const handleExamModalClose = () => {
    setShowExamModal(false);
    setExamRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-black text-white w-full">
        <Sidebar className="w-64 bg-black border-r border-zinc-800">
        <div className="flex flex-col items-center text-center px-6 py-4 border-b border-zinc-800">
          <img
            src="/blank-profile-icon.png"
            alt="Profile"
            className="w-16 h-16 rounded-full mb-3 border border-gray-600"
          />
          <h3 className="text-lg font-semibold">
            {user ? `${user.name} ${user.surname}` : "Loading..."}
          </h3>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {user ? getRoleString(user) : ""}
          </p>

          <button
            onClick={() => setShowSettings(true)}
            className="mt-4 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm w-fit"
          >
            Update Info
          </button>
        </div>


          <nav className="flex flex-col px-4 pt-4 space-y-2 text-sm">
            <Link href="/home-page" className="flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              <CalendarDays className="h-5 w-5 text-gray-300" />
              <span className="ml-2">My Schedule</span>
            </Link>
            <Link href="/proctoring" className="flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors">
              <FileText className="h-5 w-5 text-gray-300" />
              <span className="ml-2">Exams</span>
            </Link>
            <Link href="/requests" className="flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors">
              <CheckCircle className="h-5 w-5 text-gray-300" />
              <span className="ml-2">Approve/Reject Requests</span>
            </Link>
            <Link href="/edit-info" className="flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors">
              <UserRound className="h-5 w-5 text-gray-300" />
              <span className="ml-2">Edit/View Information</span>
            </Link>
            <Link href="/settings" className="flex items-center px-3 py-2 rounded hover:bg-gray-700 transition-colors">
              <SettingsIcon className="h-5 w-5 text-gray-300" />
              <span className="ml-2">Settings</span>
            </Link>
          </nav>
        </Sidebar>

        <main className="flex-1 bg-gray-950 p-8 w-full">
        <div className="w-full">
            {user && (
              <p className="mb-4 text-gray-300">
                Hi {user.name}, you are logged in as {user.email}. <br />
                <strong>{getRoleString(user)}</strong>
              </p>
            )}

            {/* If TA, show schedule */}
            {user && user.isTA && <TAWeeklySchedule />}

            {/* If Staff, show courses + exam section */}
            {user && !user.isTA && user.courses && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Your Courses:</h3>
                <ul className="list-disc ml-6 text-gray-200">
                  {user.courses.map((course) => (
                    <li key={course.id}>
                      {course.code} - {course.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user && !user.isTA && (
              <div className="flex items-center justify-between mb-4 mt-8">
                <h2 className="text-xl font-semibold">MY EXAMS</h2>
                <button
                  onClick={() => setShowExamModal(true)}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded"
                >
                  Add Exam
                </button>
              </div>
            )}

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
          <AddExamModal onClose={handleExamModalClose} />
        )}
      </div>
    </SidebarProvider>
  );
}
