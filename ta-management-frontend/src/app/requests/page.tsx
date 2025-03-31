"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";
import { Inbox } from "lucide-react";
import { PageLoader } from "@/components/ui/loading-spinner";

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

  // If user is staff (not a TA), fetch pending/past requests
  useEffect(() => {
    if (user && !user.isTA) {
      fetchPendingRequests();
      fetchPastRequests();
    }
  }, [user]);

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/pending-requests/");
      if (res.data.status === "success") {
        setPendingRequests(res.data.duties);
      } else {
        setMessage(res.data.message || "Error fetching pending requests.");
      }
    } catch {
      setMessage("Error fetching pending requests.");
    }
  };

  // Fetch past requests (approved or rejected)
  const fetchPastRequests = async () => {
    try {
      const res = await apiClient.get("/taduties/past-requests/");
      if (res.data.status === "success") {
        setPastRequests(res.data.duties);
      } else {
        setMessage(res.data.message || "Error fetching past requests.");
      }
    } catch {
      setMessage("Error fetching past requests.");
    }
  };

  // Approve/Reject handler
  const updateDutyStatus = async (dutyId: number, newStatus: string) => {
    try {
      const res = await apiClient.post(`/taduties/${dutyId}/update-status/`, {
        status: newStatus,
      });
      if (res.data.status === "success") {
        setMessage(`Duty ${newStatus}.`);
        // Refresh both lists
        fetchPendingRequests();
        fetchPastRequests();
      } else {
        setMessage(res.data.message || "Error updating duty status.");
      }
    } catch {
      setMessage("Error updating duty status.");
    }
  };

  // Status color-coding (lighter approach)
  function getStatusColor(status: string) {
    const lower = status.toLowerCase();
    switch (lower) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Format decimal hours into "Hh Mm" (e.g., 2.98 → "2h 59m")
  function formatDuration(durationInHours: number): string {
    const totalMinutes = Math.round(durationInHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  // Loading and error messages
  if (loading)
    return <PageLoader />;

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        No user found.
      </div>
    );
  if (user.isTA)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        Only staff can access this page.
      </div>
    );

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8">
          <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
            <Inbox className="h-8 w-8 text-blue-600" /> Requests
          </h1>

          {message && <div className="mb-4 text-red-600">{message}</div>}

          {/* Pending Requests Card */}
          <div className="mb-8 bg-gray-50 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Pending Requests</h2>
            {pendingRequests.length === 0 ? (
              <p className="text-gray-700">No pending requests.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-800">
                    <th className="border border-gray-300 p-2">TA Email</th>
                    <th className="border border-gray-300 p-2">TA Name</th>
                    <th className="border border-gray-300 p-2">Course Code</th>
                    <th className="border border-gray-300 p-2">Duty Type</th>
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Start</th>
                    <th className="border border-gray-300 p-2">End</th>
                    <th className="border border-gray-300 p-2">Duration</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Description</th>
                    <th className="border border-gray-300 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((duty) => (
                    <tr key={duty.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 p-2">{duty.ta_email}</td>
                      <td className="border border-gray-300 p-2">{duty.ta_name}</td>
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
                      <td className="border border-gray-300 p-2">
                        <button
                          onClick={() => updateDutyStatus(duty.id, "approved")}
                          className="mr-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateDutyStatus(duty.id, "rejected")}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Past Requests Card */}
          <div className="bg-gray-50 p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Past Requests</h2>
            {pastRequests.length === 0 ? (
              <p className="text-gray-700">No past requests.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-800">
                    <th className="border border-gray-300 p-2">TA Email</th>
                    <th className="border border-gray-300 p-2">TA Name</th>
                    <th className="border border-gray-300 p-2">Course Code</th>
                    <th className="border border-gray-300 p-2">Duty Type</th>
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Start</th>
                    <th className="border border-gray-300 p-2">End</th>
                    <th className="border border-gray-300 p-2">Duration</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRequests.map((duty) => (
                    <tr key={duty.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 p-2">{duty.ta_email}</td>
                      <td className="border border-gray-300 p-2">{duty.ta_name}</td>
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
