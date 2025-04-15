"use client";

import React, { useState, useEffect } from "react";
import apiClient from "@/lib/axiosClient";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser, UserData } from "@/components/general/user-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Type definitions for the assignment data
interface Staff {
  name: string;
  surname: string;
  email: string;
}

interface Course {
  code: string;
  name: string;
}

interface TA {
  name: string;
  surname: string;
  email: string;
}

interface Assignment {
  staff: Staff;
  course: Course;
  min_load: number;
  max_load: number;
  num_graders: number;
  must_have_ta: TA[];
  preferred_tas: TA[];
  preferred_graders: TA[];
  avoided_tas: TA[];
}

export default function AssignmentsPage() {
  const { user, loading } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Call the Django API endpoint for assignment preferences
    apiClient
      .get("/assignment/list-assignments/")
      .then((res) => {
        if (res.data.status === "success") {
          setAssignments(res.data.assignments);
        } else {
          setMessage(res.data.message || "Error fetching assignments.");
        }
      })
      .catch((err) => {
        console.error("Error fetching assignments:", err);
        setMessage("Error fetching assignments.");
      });
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Loading...
      </div>
    );

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        No user found.
      </div>
    );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gray-100">
        {/* AppSidebar is now wrapped within SidebarProvider, so useSidebar will work */}
        <AppSidebar user={user as UserData} />
        <SidebarInset className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6">TA Assignment Preferences</h1>
          {message && (
            <p className="mb-4 text-center text-red-600">{message}</p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Instructor</th>
                  <th className="px-4 py-2 border">Course</th>
                  <th className="px-4 py-2 border">Min Load</th>
                  <th className="px-4 py-2 border">Max Load</th>
                  <th className="px-4 py-2 border">Num Graders</th>
                  <th className="px-4 py-2 border">Must-Have TAs</th>
                  <th className="px-4 py-2 border">Preferred TAs</th>
                  <th className="px-4 py-2 border">Preferred Graders</th>
                  <th className="px-4 py-2 border">Avoided TAs</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length > 0 ? (
                  assignments.map((a, idx) => (
                    <tr key={idx} className="border-b odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2 border">
                        {a.staff.name} {a.staff.surname}
                      </td>
                      <td className="px-4 py-2 border">
                        {a.course.code} – {a.course.name}
                      </td>
                      <td className="px-4 py-2 border">{a.min_load}</td>
                      <td className="px-4 py-2 border">{a.max_load}</td>
                      <td className="px-4 py-2 border">{a.num_graders}</td>
                      <td className="px-4 py-2 border">
                        {a.must_have_ta.length > 0
                          ? a.must_have_ta
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {a.preferred_tas.length > 0
                          ? a.preferred_tas
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {a.preferred_graders.length > 0
                          ? a.preferred_graders
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {a.avoided_tas.length > 0
                          ? a.avoided_tas
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center text-gray-600">
                      No assignments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
