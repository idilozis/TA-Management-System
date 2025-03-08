"use client";

import React from "react";
import Link from "next/link";
import { HomeIcon, ClipboardIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { User } from "@heroui/react";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";

const HomePage = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar className="w-64 bg-blue-100 p-6 shadow-md">
          <User
            avatarProps={{
              src: "/blank-profile-icon.png"
            }}
            description="Teaching Assistant "
            name="Jane Doe"
            className="mb-4"
          />
          <h2 className="text-xl text-center font-semibold mb-6">Welcome, Jane!</h2>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-4">
            <Link
              href="/ta-duties"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <HomeIcon className="h-6 w-6 text-blue-500" />
              <span className="ml-3 text-lg">TA Duties</span>
            </Link>
            <Link
              href="/proctoring"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <ClipboardIcon className="h-6 w-6 text-green-500" />
              <span className="ml-3 text-lg">Proctoring</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center p-2 rounded hover:bg-gray-200 transition-colors"
            >
              <ChartBarIcon className="h-6 w-6 text-purple-500" />
              <span className="ml-3 text-lg">Reports</span>
            </Link>
          </nav>
        </Sidebar>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <h1 className="text-3xl font-bold mb-4">
            TA Management System Home Page
          </h1>
          <p>
            Welcome to the TA Management System. Use the sidebar to navigate between TA Duties,
            Proctoring, and Reports.
          </p>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default HomePage;
