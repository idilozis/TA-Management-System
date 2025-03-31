"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";
import { ClipboardList } from "lucide-react";

// Data interfaces
interface Course {
  id: number;
  code: string;
  name: string;
}

interface Duty {
  id: number;
  course: string | null; // This holds the course CODE from the backend
  duty_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number; // decimal hours (e.g. 2.98)
  status: string;         // "Pending", "Approved", or "Rejected"
  description: string;
}

export default function TADutiesPage() {
  const { user, loading } = useUser();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");

  // Local state for new duty form
  const [newDuty, setNewDuty] = useState({
    duty_type: "",
    date: "",
    start_time: "",
    end_time: "",
    description: "",
    course_code: "",
  });

  // Helper: convert decimal hours to "Hh Mm"
  function formatDuration(durationInHours: number): string {
    const totalMinutes = Math.round(durationInHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  // Helper: color-coding for statuses (lighter approach)
  function getStatusColor(status: string) {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Fetch TA's existing duties
  const fetchDuties = async () => {
    try {
      const res = await apiClient.get("/taduties/my-duties/");
      if (res.data.status === "success") {
        setDuties(res.data.duties);
      } else {
        setMessage(res.data.message || "Error fetching duties.");
      }
    } catch {
      setMessage("Error fetching duties.");
    }
  };

  // Fetch all courses for the dropdown
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get("/list/courses/");
      if (res.data.status === "success") {
        setCourses(res.data.courses);
      } else {
        setMessage(res.data.message || "Error fetching courses.");
      }
    } catch {
      setMessage("Error fetching courses.");
    }
  };

  // On mount (and once user is known), fetch duties if TA, and fetch courses
  useEffect(() => {
    if (user && user.isTA) {
      fetchDuties();
      fetchCourses();
    }
  }, [user]);

  // Submit handler for creating a new duty
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await apiClient.post("/taduties/create-duty/", newDuty);
      if (res.data.status === "success") {
        setMessage("Duty created successfully!");
        fetchDuties();
        // Reset form
        setNewDuty({
          duty_type: "",
          date: "",
          start_time: "",
          end_time: "",
          description: "",
          course_code: "",
        });
      } else {
        setMessage(res.data.message || "Error creating duty.");
      }
    } catch {
      setMessage("Error creating duty.");
    }
  };

  // Loading and error messages
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        Loading...
      </div>
    );
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        No user found.
      </div>
    );
  if (!user.isTA)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        Only TAs can access this page.
      </div>
    );

  // Separate duties into pending vs. past
  const pendingDuties = duties.filter((d) => d.status === "Pending");
  const pastDuties = duties.filter((d) => d.status !== "Pending");

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Main layout with lighter background and dark text */}
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8">
          <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-blue-600"/> My Duties
          </h1>

          {message && <div className="mb-4 text-red-600">{message}</div>}

          {/* Create Duty Form */}
          <div className="mb-8 bg-gray-50 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Create New Task</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Duty Type Dropdown */}
              <div>
                <label className="block mb-1">Task Type:</label>
                <select
                  value={newDuty.duty_type}
                  onChange={(e) => setNewDuty({ ...newDuty, duty_type: e.target.value })}
                  className="p-2 rounded border border-gray-300 bg-white text-gray-900 w-full"
                  required
                >
                  <option value="">-- Select --</option>
                  <option value="lab">Lab</option>
                  <option value="grading">Grading</option>
                  <option value="recitation">Recitation</option>
                  <option value="office_hours">Office Hours</option>
                  <option value="exam_proctoring">Proctoring</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Date, Start, End times */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1">Date:</label>
                  <input
                    type="date"
                    value={newDuty.date}
                    onChange={(e) => setNewDuty({ ...newDuty, date: e.target.value })}
                    className="p-2 rounded border border-gray-300 bg-white text-gray-900 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Start Time:</label>
                  <input
                    type="time"
                    value={newDuty.start_time}
                    onChange={(e) => setNewDuty({ ...newDuty, start_time: e.target.value })}
                    className="p-2 rounded border border-gray-300 bg-white text-gray-900 w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">End Time:</label>
                  <input
                    type="time"
                    value={newDuty.end_time}
                    onChange={(e) => setNewDuty({ ...newDuty, end_time: e.target.value })}
                    className="p-2 rounded border border-gray-300 bg-white text-gray-900 w-full"
                    required
                  />
                </div>
              </div>

              {/* Course Dropdown */}
              <div>
                <label className="block mb-1">Course Name:</label>
                <select
                  value={newDuty.course_code}
                  onChange={(e) => setNewDuty({ ...newDuty, course_code: e.target.value })}
                  className="p-2 rounded border border-gray-300 bg-white text-gray-900 w-full"
                  required
                >
                  <option value="">-- Select --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.code}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-1">Description:</label>
                <textarea
                  value={newDuty.description}
                  onChange={(e) => setNewDuty({ ...newDuty, description: e.target.value })}
                  placeholder="Optional description"
                  className="p-2 w-full rounded border border-gray-300 bg-white text-gray-900"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500"
              >
                Send Request
              </button>
            </form>
          </div>

          {/* Pending Requests */}
          <div className="bg-gray-50 p-6 rounded shadow mb-8">
            <h2 className="text-2xl font-semibold mb-4">Pending Requests</h2>
            {pendingDuties.length === 0 ? (
              <p className="text-gray-700">No pending requests.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-800">
                    <th className="border border-gray-300 p-2">Course Code</th>
                    <th className="border border-gray-300 p-2">Type</th>
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Start</th>
                    <th className="border border-gray-300 p-2">End</th>
                    <th className="border border-gray-300 p-2">Duration</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDuties.map((duty) => (
                    <tr key={duty.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 p-2">{duty.course || "N/A"}</td>
                      <td className="border border-gray-300 p-2">{duty.duty_type}</td>
                      <td className="border border-gray-300 p-2">{duty.date}</td>
                      <td className="border border-gray-300 p-2">{duty.start_time}</td>
                      <td className="border border-gray-300 p-2">{duty.end_time}</td>
                      <td className="border border-gray-300 p-2">
                        {formatDuration(duty.duration_hours)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                          {duty.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2">{duty.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Past Duties */}
          <div className="bg-gray-50 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Past Requests</h2>
            {pastDuties.length === 0 ? (
              <p className="text-gray-700">No past requests.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-800">
                    <th className="border border-gray-300 p-2">Course Code</th>
                    <th className="border border-gray-300 p-2">Type</th>
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Start</th>
                    <th className="border border-gray-300 p-2">End</th>
                    <th className="border border-gray-300 p-2">Duration</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pastDuties.map((duty) => (
                    <tr key={duty.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 p-2">{duty.course || "N/A"}</td>
                      <td className="border border-gray-300 p-2">{duty.duty_type}</td>
                      <td className="border border-gray-300 p-2">{duty.date}</td>
                      <td className="border border-gray-300 p-2">{duty.start_time}</td>
                      <td className="border border-gray-300 p-2">{duty.end_time}</td>
                      <td className="border border-gray-300 p-2">
                        {formatDuration(duty.duration_hours)}
                      </td>
                      <td className="border border-gray-300 p-2">
                        <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                          {duty.status}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2">{duty.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );

}
