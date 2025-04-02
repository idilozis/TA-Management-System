"use client";

import React, { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import ProctoringStaff from "./staff-ui/ProctoringStaff";
import ProctoringTA from "./ta-ui/ProctoringTA";
import TALeaveTA from "./ta-ui/TALeaveTA";
import TALeaveStaff from "./staff-ui/TALeaveStaff";

export default function ProctoringPage() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<"assignments" | "leave">("assignments");

  if (loading) return <PageLoader />;
  if (!user) return <div className="min-h-screen flex items-center justify-center">No user found.</div>;

  const renderContent = () => {
    if (activeTab === "assignments") {
      return user.isTA ? <ProctoringTA /> : <ProctoringStaff />;
    } else {
      return user.isTA ? <TALeaveTA /> : <TALeaveStaff />;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8 w-full">
          <nav className="mb-8 flex gap-4">
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-4 py-2 rounded ${
                activeTab === "assignments" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              Proctor Assignments
            </button>
            <button
              onClick={() => setActiveTab("leave")}
              className={`px-4 py-2 rounded ${
                activeTab === "leave" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              TA Leave Requests
            </button>
          </nav>
          {renderContent()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
