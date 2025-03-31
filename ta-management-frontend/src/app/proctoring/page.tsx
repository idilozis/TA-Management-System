"use client";

import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function Proctoring() {
  const { user, loading } = useUser();

  if (loading) return <PageLoader />;
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">No user found</div>;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-50 text-gray-700">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8">
          <h1 className="text-4xl font-bold">
            This is the initial PROCTORING page.
          </h1>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
