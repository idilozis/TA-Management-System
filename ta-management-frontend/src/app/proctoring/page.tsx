"use client";

import React from "react";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";

export default function Proctoring() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      
      <h1 className="text-4xl font-bold text-gray-700">
        This is initial proctoring page.    
      </h1>

    </div>
  );
}
