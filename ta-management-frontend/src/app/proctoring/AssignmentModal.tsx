"use client";

import React from "react";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";
import { PageLoader } from "@/components/ui/loading-spinner";

export default function AssignmentModal() {
  const { user, loading } = useUser();

  if (loading) return <PageLoader />;
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">No user found</div>;

  return (
      <div className="flex min-h-screen w-full text-gray-700">
          <h1 className="text-4xl font-bold">
            This is the initial PROCTORING ASSIGNMENT page.
          </h1>
      </div>
  );
}
