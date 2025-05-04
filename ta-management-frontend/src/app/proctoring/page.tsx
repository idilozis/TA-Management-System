"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import ProctoringStaff from "./staff-ui/ProctoringStaff";
import ProctoringTA from "./ta-ui/ProctoringTA";

export default function ProctoringPage() {
  const { user, loading } = useUser();

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center">
        No user found.
      </div>
    );

  // Decide which Proctoring view to show:
  // - TAs get the TA UI
  // - Regular staff (not isAuth) get the staff UI
  const content = user.isTA
    ? <ProctoringTA />
    : !user.isAuth
      ? <ProctoringStaff />
      : (
        <div className="min-h-screen flex items-center justify-center text-red-600">
          You are not allowed to view this page.
        </div>
      );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8 w-full">
          {content}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
