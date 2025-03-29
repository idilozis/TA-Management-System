"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";

// Data interface for a duty
interface Duty {
  id: number;
  ta_email: string;
  ta_name: string;
  course: string | null; // course code
  duty_type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  status: string; // "Pending", "Approved", or "Rejected"
  description: string;
}

export default function RequestsPage() {
  const { user, loading } = useUser();
  const [pendingRequests, setPendingRequests] = useState<Duty[]>([]);
  const [pastRequests, setPastRequests] = useState<Duty[]>([]);
  const [message, setMessage] = useState("");

  // Fetch pending requests for courses taught by this staff user
  const fetchPendingRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/pending-requests/");
      if (res.data.status === "success") {
        setPendingRequests(res.data.duties);
      } else {
        setMessage(res.data.message || "Error fetching pending requests.");
      }
    } catch (error) {
      setMessage("Error fetching pending requests.");
    }
  };

  // Fetch past requests (approved or rejected) for courses taught by this staff user
  const fetchPastRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/past-requests/");
      if (res.data.status === "success") {
        setPastRequests(res.data.duties);
      } else {
        setMessage(res.data.message || "Error fetching past requests.");
      }
    } catch (error) {
      setMessage("Error fetching past requests.");
    }
  };

  useEffect(() => {
    if (user && !user.isTA) {
      fetchPendingRequests();
      fetchPastRequests();
    }
  }, [user]);

  // Handler for updating duty status (approve/reject)
  const updateDutyStatus = async (dutyId: number, newStatus: string) => {
    try {
      const res = await apiClient.post(`/taduties/${dutyId}/update-status/`, { status: newStatus });
      if (res.data.status === "success") {
        setMessage(`Duty ${newStatus}.`);
        // Refresh both lists after update
        fetchPendingRequests();
        fetchPastRequests();
      } else {
        setMessage(res.data.message || "Error updating duty status.");
      }
    } catch (error) {
      setMessage("Error updating duty status.");
    }
  };

  // Helper: Color-coding for statuses (compare in lowercase)
  function getStatusColor(status: string) {
    const lower = status.toLowerCase();
    switch (lower) {
      case "pending":
        return "bg-yellow-500 text-black";
      case "approved":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  }

  // Helper: Format decimal hours into "Hh Mm" (e.g., 2.98 → "2h 59m")
  function formatDuration(durationInHours: number): string {
    const totalMinutes = Math.round(durationInHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!user) return <div className="p-8 text-white">No user found.</div>;
  if (user.isTA) return <div className="p-8 text-white">Only staff can access this page.</div>;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} />
        <SidebarInset className="bg-gray-950 p-8">
          {message && <div className="mb-4 text-red-400">{message}</div>}

          {/* Pending Requests Section */}
          <h1 className="text-3xl font-bold mb-6">Pending Requests</h1>
          {pendingRequests.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <table className="w-full border-collapse mb-8">
              <thead>
                <tr>
                  <th className="border p-2">TA Email</th>
                  <th className="border p-2">TA Name</th>
                  <th className="border p-2">Course Code</th>
                  <th className="border p-2">Duty Type</th>
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Start</th>
                  <th className="border p-2">End</th>
                  <th className="border p-2">Duration</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((duty) => (
                  <tr key={duty.id}>
                    <td className="border p-2">{duty.ta_email}</td>
                    <td className="border p-2">{duty.ta_name}</td>
                    <td className="border p-2">{duty.course || "N/A"}</td>
                    <td className="border p-2">{duty.duty_type}</td>
                    <td className="border p-2">{duty.date}</td>
                    <td className="border p-2">{duty.start_time}</td>
                    <td className="border p-2">{duty.end_time}</td>
                    <td className="border p-2">{formatDuration(duty.duration_hours)}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                        {duty.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="border p-2">{duty.description}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => updateDutyStatus(duty.id, "approved")}
                        className="mr-2 px-2 py-1 bg-green-600 rounded hover:bg-green-500"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateDutyStatus(duty.id, "rejected")}
                        className="px-2 py-1 bg-red-600 rounded hover:bg-red-500"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Past Requests Section */}
          <h1 className="text-3xl font-bold mb-6">Past Requests</h1>
          {pastRequests.length === 0 ? (
            <p>No past requests.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">TA Email</th>
                  <th className="border p-2">TA Name</th>
                  <th className="border p-2">Course Code</th>
                  <th className="border p-2">Duty Type</th>
                  <th className="border p-2">Date</th>
                  <th className="border p-2">Start</th>
                  <th className="border p-2">End</th>
                  <th className="border p-2">Duration</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {pastRequests.map((duty) => (
                  <tr key={duty.id}>
                    <td className="border p-2">{duty.ta_email}</td>
                    <td className="border p-2">{duty.ta_name}</td>
                    <td className="border p-2">{duty.course || "N/A"}</td>
                    <td className="border p-2">{duty.duty_type}</td>
                    <td className="border p-2">{duty.date}</td>
                    <td className="border p-2">{duty.start_time}</td>
                    <td className="border p-2">{duty.end_time}</td>
                    <td className="border p-2">{formatDuration(duty.duration_hours)}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded ${getStatusColor(duty.status)}`}>
                        {duty.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="border p-2">{duty.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );

}
