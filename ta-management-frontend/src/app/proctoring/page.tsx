"use client";

import React, { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import ProctoringStaff from "./staff-ui/ProctoringStaff";
import ProctoringTA from "./ta-ui/ProctoringTA";
import TALeaveTA from "./ta-ui/TALeaveTA";
import TALeaveAuthorized from "./staff-ui/TALeaveAuthorized";

export default function ProctoringPage() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<"assignments" | "leave">("assignments");

  // Determine which tabs to show based on user type
  const showAssignmentsTab = user?.isTA || (user && !user.isTA && !user.isAuth); // TAs and Staff
  const showLeaveTab = user?.isTA || (user && user.isAuth); // TAs and Authorized users

  // Set default active tab based on user type - MOVED TO TOP LEVEL
  useEffect(() => {
    if (user) {
      // If user can't see assignments tab but can see leave tab, default to leave
      if (!showAssignmentsTab && showLeaveTab) {
        setActiveTab("leave");
      }
      // If user can see assignments tab but not leave tab, default to assignments
      else if (showAssignmentsTab && !showLeaveTab) {
        setActiveTab("assignments");
      }
    }
  }, [user, showAssignmentsTab, showLeaveTab]);

  if (loading) return <PageLoader />;
  if (!user) return <div className="min-h-screen flex items-center justify-center">No user found.</div>;

  const renderContent = () => {
    // For assignments tab
    if (activeTab === "assignments") {
      if (user.isTA) return <ProctoringTA />;
      if (!user.isTA && !user.isAuth) return <ProctoringStaff />;
      return null;
    } 
    // For leave tab
    else if (activeTab === "leave") {
      if (user.isTA) return <TALeaveTA />;
      if (!user.isTA && user.isAuth) return <TALeaveAuthorized />;
      return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8 w-full">
          {/* Only show nav if there are multiple tabs to display */}
          {showAssignmentsTab && showLeaveTab && (
            <nav className="mb-8 flex gap-4">
              {showAssignmentsTab && (
                <button
                  onClick={() => setActiveTab("assignments")}
                  className={`px-4 py-2 rounded ${
                    activeTab === "assignments"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  Proctoring Assignments
                </button>
              )}

              {showLeaveTab && (
                <button
                  onClick={() => setActiveTab("leave")}
                  className={`px-4 py-2 rounded ${
                    activeTab === "leave"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  TA Leave Requests
                </button>
              )}
            </nav>
          )}
          {renderContent()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}