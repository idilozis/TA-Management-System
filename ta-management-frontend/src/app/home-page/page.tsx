"use client";

import apiClient from "@/lib/axiosClient";
import { useEffect, useState } from "react";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import Link from "next/link";
import { HomeIcon, ClipboardIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/general/settings";

interface UserData {
  name: string;
  surname?: string; // TAs
  email: string;
  isTA: boolean;
  program?: string; // TAs
  advisor?: string; // TAs
  courses?: string; // Staff
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
        Staff of {user.department} <br />
        Your Courses: {user.courses}
      </>
    );
  }
};

const HomePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  return (
    <SidebarProvider>
      <div className="flex h-screen">
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
              href="/proctoring"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <ClipboardIcon className="h-6 w-6 text-green-600" />
              <span className="ml-3 text-lg">Proctoring</span>
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

        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-4">TA Management System Home Page</h1>
          {user && (
            <p>
              Hi {user.name}, you are logged in as {user.email}. <br />
              <strong>{getRoleString(user)}</strong>.
            </p>
          )}
          <p>Use the sidebar to navigate between TA Duties, Proctoring, and Reports.</p>
        </main>

        {showSettings && user && (
          <SettingsModal 
            user={user} 
            onClose={() => setShowSettings(false)} 
            onUpdateUser={(updatedUser) => setUser(updatedUser)} // Update local state.
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default HomePage;
