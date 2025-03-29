"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";

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
  status: string;        // "Pending", "Approved", or "Rejected"
  description: string;
}

export default function TADutiesPage() {
  const { user, loading } = useUser();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("");

  // Local state for new duty form
  // duty_type is initially "" so user must select
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

  // Helper: color-coding for statuses
  function getStatusColor(status: string) {
    switch (status) {
      case "Pending":
        return "bg-yellow-500 text-black";
      case "Approved":
        return "bg-green-500 text-white";
      case "Rejected":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  // 1) Fetch TA's existing duties
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

  // 2) Fetch all courses for the dropdown
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

  // Loading or user checks
  if (loading) return <div className="text-white p-8">Loading...</div>;
  if (!user) return <div className="text-white p-8">No user found</div>;
  if (!user.isTA) return <div className="text-white p-8">Only TAs can access this page</div>;

  // Separate duties into pending vs. past
  const pendingDuties = duties.filter((d) => d.status === "Pending");
  const pastDuties = duties.filter((d) => d.status !== "Pending");

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} />
        <SidebarInset className="bg-gray-950 p-8">
          <h1 className="text-3xl font-bold mb-6">My TA Duties</h1>

          {message && <div className="mb-4 text-red-400">{message}</div>}

          {/* Create Duty Form */}
          <div className="mb-8 bg-gray-800 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Create New Duty</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Duty Type Dropdown */}
              <div>
                <label className="block mb-1">Duty Type:</label>
                <select
                  value={newDuty.duty_type}
                  onChange={(e) =>
                    setNewDuty({ ...newDuty, duty_type: e.target.value })
                  }
                  className="p-2 rounded border border-gray-700 bg-gray-700 text-white"
                  required
                >
                  <option value="">-- Select a Duty Type --</option>
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
                    onChange={(e) =>
                      setNewDuty({ ...newDuty, date: e.target.value })
                    }
                    className="p-2 rounded border border-gray-700 bg-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">Start Time:</label>
                  <input
                    type="time"
                    value={newDuty.start_time}
                    onChange={(e) =>
                      setNewDuty({ ...newDuty, start_time: e.target.value })
                    }
                    className="p-2 rounded border border-gray-700 bg-gray-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1">End Time:</label>
                  <input
                    type="time"
                    value={newDuty.end_time}
                    onChange={(e) =>
                      setNewDuty({ ...newDuty, end_time: e.target.value })
                    }
                    className="p-2 rounded border border-gray-700 bg-gray-700 text-white"
                    required
                  />
                </div>
              </div>

              {/* Course Dropdown */}
              <div>
                <label className="block mb-1">Course:</label>
                <select
                  value={newDuty.course_code}
                  onChange={(e) =>
                    setNewDuty({ ...newDuty, course_code: e.target.value })
                  }
                  className="p-2 rounded border border-gray-700 bg-gray-700 text-white"
                  required
                >
                  <option value="">-- Select a Course --</option>
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
                  onChange={(e) =>
                    setNewDuty({ ...newDuty, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="p-2 w-full rounded border border-gray-700 bg-gray-700 text-white"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500"
              >
                Create Duty
              </button>
            </form>
          </div>

          {/* Pending Requests */}
          <div className="bg-gray-800 p-6 rounded shadow mb-8">
            <h2 className="text-2xl font-semibold mb-4">Pending Requests</h2>
            {pendingDuties.length === 0 ? (
              <p>No pending requests.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2">Course Code</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Start</th>
                    <th className="border p-2">End</th>
                    <th className="border p-2">Duration</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDuties.map((duty) => (
                    <tr key={duty.id}>
                      <td className="border p-2">{duty.course || "N/A"}</td>
                      <td className="border p-2">{duty.duty_type}</td>
                      <td className="border p-2">{duty.date}</td>
                      <td className="border p-2">{duty.start_time}</td>
                      <td className="border p-2">{duty.end_time}</td>
                      <td className="border p-2">
                        {formatDuration(duty.duration_hours)}
                      </td>
                      <td className="border p-2">
                        <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                          {duty.status}
                        </span>
                      </td>
                      <td className="border p-2">{duty.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Past Duties */}
          <div className="bg-gray-800 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Past Duties</h2>
            {pastDuties.length === 0 ? (
              <p>No past duties.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2">Course Code</th>
                    <th className="border p-2">Type</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Start</th>
                    <th className="border p-2">End</th>
                    <th className="border p-2">Duration</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pastDuties.map((duty) => (
                    <tr key={duty.id}>
                      <td className="border p-2">{duty.course || "N/A"}</td>
                      <td className="border p-2">{duty.duty_type}</td>
                      <td className="border p-2">{duty.date}</td>
                      <td className="border p-2">{duty.start_time}</td>
                      <td className="border p-2">{duty.end_time}</td>
                      <td className="border p-2">
                        {formatDuration(duty.duration_hours)}
                      </td>
                      <td className="border p-2">
                        <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                          {duty.status}
                        </span>
                      </td>
                      <td className="border p-2">{duty.description}</td>
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
