"use client";

import React, { useState, useEffect } from "react";
import { Table2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";

// Data interfaces
interface CourseData {
  code: string;
  name: string;
  instructors: string[]; 
}

interface TAData {
  email: string;
  name: string;
  surname: string;
  advisor: string;
  program: string;
  student_id: string;
  phone: string;
}

interface StaffData {
  email: string;
  name: string;
  surname: string;
  department: string;
  courses: string[]; 
}

type Tab = "courses" | "tas" | "staff";

export default function TablesPage() {
  const { user, loading } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("courses");

  // State for each table data
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [tas, setTAs] = useState<TAData[]>([]);
  const [staff, setStaff] = useState<StaffData[]>([]);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true);
      setError("");

      try {
        if (activeTab === "courses") {
          const res = await apiClient.get("/list/courses/");
          if (res.data.status === "success") {
            setCourses(res.data.courses);
          } else {
            setError(res.data.message || "Error fetching courses.");
          }
        } else if (activeTab === "tas") {
          const res = await apiClient.get("/list/tas/");
          if (res.data.status === "success") {
            setTAs(res.data.tas);
          } else {
            setError(res.data.message || "Error fetching TAs.");
          }
        } else if (activeTab === "staff") {
          const res = await apiClient.get("/list/staff/");
          if (res.data.status === "success") {
            setStaff(res.data.staff);
          } else {
            setError(res.data.message || "Error fetching staff.");
          }
        }
      } catch (err: any) {
        setError("Error fetching data. Please try again.");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [activeTab]);

  // If user data is still loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        Loading...
      </div>
    );
  }

  // If no user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
        No user found
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-50 text-gray-700">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8">
          <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
            <Table2 className="h-8 w-8 text-blue-600" /> Tables
          </h1>

          {/* Tab Navigation */}
          <div className="mb-6 flex space-x-4 border-b pb-2">
            <button
              onClick={() => setActiveTab("courses")}
              className={`pb-1 ${
                activeTab === "courses"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Courses
            </button>
            <button
              onClick={() => setActiveTab("tas")}
              className={`pb-1 ${
                activeTab === "tas"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              TAs
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`pb-1 ${
                activeTab === "staff"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Staff
            </button>
          </div>

          {/* Error Display */}
          {error && <div className="text-red-600 mb-4">{error}</div>}

          {/* Loading Spinner */}
          {loadingData && <div className="text-gray-500">Loading table...</div>}

          {/* Tab Content */}
          {!loadingData && activeTab === "courses" && <CoursesTable courses={courses} />}
          {!loadingData && activeTab === "tas" && <TAsTable tas={tas} />}
          {!loadingData && activeTab === "staff" && <StaffTable staff={staff} />}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


// ----------------------------------
// Table components
// ----------------------------------
function CoursesTable({ courses }: { courses: CourseData[] }) {
  if (courses.length === 0) {
    return <div>No courses found.</div>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2 text-left">Code</th>
          <th className="border p-2 text-left">Name</th>
          <th className="border p-2 text-left">Instructors</th>
        </tr>
      </thead>
      <tbody>
        {courses.map((c) => (
          <tr key={c.code} className="hover:bg-gray-50">
            <td className="border p-2">{c.code}</td>
            <td className="border p-2">{c.name}</td>
            <td className="border p-2">
              {c.instructors.length === 0
                ? "None"
                : c.instructors.join(", ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TAsTable({ tas }: { tas: TAData[] }) {
  if (tas.length === 0) {
    return <div>No TAs found.</div>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2 text-left">Name</th>
          <th className="border p-2 text-left">Advisor</th>
          <th className="border p-2 text-left">Program</th>
          <th className="border p-2 text-left">Student ID</th>
          <th className="border p-2 text-left">Phone</th>
          <th className="border p-2 text-left">Email</th>
        </tr>
      </thead>
      <tbody>
        {tas.map((ta) => (
          <tr key={ta.email} className="hover:bg-gray-50">
            <td className="border p-2">{ta.name} {ta.surname}</td>
            <td className="border p-2">{ta.advisor}</td>
            <td className="border p-2">{ta.program}</td>
            <td className="border p-2">{ta.student_id}</td>
            <td className="border p-2">{ta.phone}</td>
            <td className="border p-2">{ta.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StaffTable({ staff }: { staff: StaffData[] }) {
  if (staff.length === 0) {
    return <div>No Staff found.</div>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2 text-left">Name</th>
          <th className="border p-2 text-left">Department</th>
          <th className="border p-2 text-left">Courses Taught</th>
          <th className="border p-2 text-left">Email</th>
        </tr>
      </thead>
      <tbody>
        {staff.map((s) => (
          <tr key={s.email} className="hover:bg-gray-50">
            <td className="border p-2">
              {s.name} {s.surname}
            </td>
            <td className="border p-2">{s.department}</td>
            <td className="border p-2">
              {s.courses.length === 0
                ? "None"
                : s.courses.join(", ")}
            </td>
            <td className="border p-2">{s.email}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

}
