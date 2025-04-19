"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/axiosClient";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Inbox, Paperclip } from "lucide-react";

interface StaffLeave {
  id: number;
  ta_email: string;
  ta_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  description: string;
  status: string;
  created_at?: string;
  document_url?: string | null;
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
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

function computeTotalDays(start_date: string, end_date: string): string {
  const start = new Date(start_date);
  const end = new Date(end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return `${diffDays} day(s)`;
}

export default function TALeaveAuthorized() {
  const { user, loading } = useUser();
  const [message, setMessage] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState<StaffLeave[]>([]);
  const [pastLeaves, setPastLeaves] = useState<StaffLeave[]>([]);
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split('-')
    return `${day}.${month}.${year}`
  }

  useEffect(() => {
    if (user && !user.isTA) {
      fetchPendingLeaves();
      fetchPastLeaves();
    }
  }, [user]);

  const fetchPendingLeaves = async () => {
    setMessage("");
    try {
      const res = await apiClient.get("/taleave/pending-leaves/");
      if (res.data.status === "success") {
        setPendingLeaves(res.data.leaves);
      } else {
        setMessage(res.data.message || "Error fetching pending leaves.");
      }
    } catch {
      setMessage("Error fetching pending leaves.");
    }
  };

  const fetchPastLeaves = async () => {
    setMessage("");
    try {
      const res = await apiClient.get("/taleave/past-leaves/");
      if (res.data.status === "success") {
        setPastLeaves(res.data.leaves);
      } else {
        setMessage(res.data.message || "Error fetching past leaves.");
      }
    } catch {
      setMessage("Error fetching past leaves.");
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: number, newStatus: string) => {
    setMessage("");
    try {
      const res = await apiClient.post(`/taleave/leaves/${leaveId}/update-status/`, {
        status: newStatus,
      });
      if (res.data.status === "success") {
        setMessage(`Leave request ${newStatus}.`);
        fetchPendingLeaves();
        fetchPastLeaves();
      } else {
        setMessage(res.data.message || "Error updating leave request.");
      }
    } catch {
      setMessage("Error updating leave request.");
    }
  };

  if (loading) return <PageLoader />;
  if (!user) return <div>No user found.</div>;
  if (user.isTA) return <div>Only staff can access this page.</div>;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
        <Inbox className="h-8 w-8 text-blue-600" /> TA Leave Requests
      </h1>
      {message && <div className="mb-4 text-red-600">{message}</div>}

      {/* Pending Leave Requests */}
      <div className="mb-8 bg-gray-50 p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Pending Leave Requests</h2>
        {pendingLeaves.length === 0 ? (
          <p className="text-gray-700">No pending leaves.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-800">
                <th className="border border-gray-300 p-2">TA Name</th>
                <th className="border border-gray-300 p-2">TA Email</th>
                <th className="border border-gray-300 p-2">Type</th>
                <th className="border border-gray-300 p-2">Start</th>
                <th className="border border-gray-300 p-2">End</th>
                <th className="border border-gray-300 p-2">Duration</th>
                <th className="border border-gray-300 p-2">Status</th>
                <th className="border border-gray-300 p-2">Description</th>
                <th className="border border-gray-300 p-2">Document</th>
                <th className="border border-gray-300 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.map((lv) => (
                <tr key={lv.id} className="hover:bg-gray-100">
                  <td className="border p-2">{lv.ta_name}</td>
                  <td className="border p-2">{lv.ta_email}</td>
                  <td className="border p-2">{lv.leave_type}</td>
                  <td className="border p-2">
                    {formatDate(lv.start_date)} ({lv.start_time})
                  </td>
                  <td className="border p-2">
                    {formatDate(lv.end_date)} ({lv.end_time})
                  </td>
                  <td className="border p-2">
                    {computeTotalDays(lv.start_date, lv.end_date)}
                  </td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded ${getStatusColor(lv.status)}`}>
                      {lv.status}
                    </span>
                  </td>
                  <td className="border p-2">{lv.description}</td>
                  
                  <td className="border p-2">
                    {lv.document_url ? (
                      <a 
                        href={`http://localhost:8000/taleave/leaves/${lv.id}/download-document/`} 
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Paperclip className="h-5 w-5" />
                        <span className="ml-1">Download</span>
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>

                  <td className="border p-2">
                    <button
                      onClick={() => handleUpdateLeaveStatus(lv.id, "approved")}
                      className="mr-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateLeaveStatus(lv.id, "rejected")}
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

      {/* Past Leave Requests */}
      <div className="bg-gray-50 p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Past Leave Requests</h2>
        {pastLeaves.length === 0 ? (
          <p className="text-gray-700">No past leave requests.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-800">
                <th className="border border-gray-300 p-2">TA Name</th>
                <th className="border border-gray-300 p-2">TA Email</th>
                <th className="border border-gray-300 p-2">Type</th>
                <th className="border border-gray-300 p-2">Start</th>
                <th className="border border-gray-300 p-2">End</th>
                <th className="border border-gray-300 p-2">Duration</th>
                <th className="border border-gray-300 p-2">Status</th>
                <th className="border border-gray-300 p-2">Description</th>
                <th className="border border-gray-300 p-2">Document</th>
              </tr>
            </thead>
            <tbody>
              {pastLeaves.map((lv) => (
                <tr key={lv.id} className="hover:bg-gray-100">
                  <td className="border p-2">{lv.ta_name}</td>
                  <td className="border p-2">{lv.ta_email}</td>
                  <td className="border p-2">{lv.leave_type}</td>
                  <td className="border p-2">
                    {formatDate(lv.start_date)} ({lv.start_time})
                  </td>
                  <td className="border p-2">
                    {formatDate(lv.end_date)} ({lv.end_time})
                  </td>
                  <td className="border p-2">
                    {computeTotalDays(lv.start_date, lv.end_date)}
                  </td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded ${getStatusColor(lv.status)}`}>
                      {lv.status}
                    </span>
                  </td>
                  <td className="border p-2">{lv.description}</td>
                  <td className="border p-2">
                    {lv.document_url ? (
                      <a 
                        href={`http://localhost:8000/taleave/leaves/${lv.id}/download-document/`} 
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Paperclip className="h-5 w-5" />
                        <span className="ml-1">Download</span>
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
