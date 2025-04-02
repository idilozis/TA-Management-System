"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/axiosClient";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import { ClipboardList, Paperclip } from "lucide-react";

interface TALeave {
  id: number;
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

function FileUploadField({ onFileSelect, selectedFileName }: { onFileSelect: (file: File | null) => void; selectedFileName: string; }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-blue-600">
        If you have any medical report or document you want to share, please upload:
      </span>
      <label
        htmlFor="document-upload"
        className="cursor-pointer inline-flex items-center px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors shadow-sm"
      >
        <Paperclip className="h-5 w-5 mr-2" />
        Select File
      </label>
      <input
        type="file"
        id="document-upload"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
          }
        }}
        accept=".pdf,image/*"
        className="hidden"
      />
      {selectedFileName && (
        <div className="flex items-center px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-sm text-blue-700">{selectedFileName}</span>
        </div>
      )}
    </div>
  );
}

export default function TALeaveTA() {
  const { user, loading } = useUser();
  const [myLeaves, setMyLeaves] = useState<TALeave[]>([]);
  const [message, setMessage] = useState("");
  const [newLeave, setNewLeave] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    description: "",
    document: null as File | null,
  });
  const [selectedFileName, setSelectedFileName] = useState("");

  useEffect(() => {
    if (user && user.isTA) {
      fetchMyLeaves();
    }
  }, [user]);

  const fetchMyLeaves = async () => {
    setMessage("");
    try {
      const res = await apiClient.get("/taleave/my-leaves/");
      if (res.data.status === "success") {
        setMyLeaves(res.data.leaves);
      } else {
        setMessage(res.data.message || "Error fetching leave requests.");
      }
    } catch {
      setMessage("Error fetching leave requests.");
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const formData = new FormData();
    formData.append("leave_type", newLeave.leave_type);
    formData.append("start_date", newLeave.start_date);
    formData.append("end_date", newLeave.end_date);
    formData.append("start_time", newLeave.start_time);
    formData.append("end_time", newLeave.end_time);
    formData.append("description", newLeave.description);
    if (newLeave.document) {
      formData.append("document", newLeave.document);
    }
    try {
      const res = await apiClient.post("/taleave/create-leave/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.status === "success") {
        setMessage("Leave request created successfully!");
        fetchMyLeaves();
        setNewLeave({
          leave_type: "",
          start_date: "",
          end_date: "",
          start_time: "",
          end_time: "",
          description: "",
          document: null,
        });
        setSelectedFileName("");
      } else {
        setMessage(res.data.message || "Error creating leave request.");
      }
    } catch {
      setMessage("Error creating leave request.");
    }
  };

  if (loading) return <PageLoader />;
  if (!user) return <div>No user found.</div>;
  if (!user.isTA) return <div>Only TAs can access this page.</div>;

  const pendingLeaves = myLeaves.filter((lv) => lv.status.toLowerCase() === "pending");
  const pastLeaves = myLeaves.filter((lv) => lv.status.toLowerCase() !== "pending");

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
        <ClipboardList className="h-8 w-8 text-blue-600" />
        TA Leave Requests
      </h1>
      {message && <div className="mb-4 text-red-600">{message}</div>}

      {/* Create Leave Form */}
      <div className="mb-8 bg-gray-50 p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Request Leave</h2>
        <form onSubmit={handleCreateLeave} className="space-y-4" encType="multipart/form-data">
          <div>
            <label className="block mb-1">Leave Type:</label>
            <select
              value={newLeave.leave_type}
              onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">-- Select --</option>
              <option value="medical">Medical</option>
              <option value="conference">Conference</option>
              <option value="vacation">Vacation</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Start Date:</label>
              <input
                type="date"
                value={newLeave.start_date}
                onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">End Date:</label>
              <input
                type="date"
                value={newLeave.end_date}
                onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Start Time:</label>
              <input
                type="time"
                value={newLeave.start_time}
                onChange={(e) => setNewLeave({ ...newLeave, start_time: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-1">End Time:</label>
              <input
                type="time"
                value={newLeave.end_time}
                onChange={(e) => setNewLeave({ ...newLeave, end_time: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Description:</label>
            <textarea
              value={newLeave.description}
              onChange={(e) => setNewLeave({ ...newLeave, description: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <FileUploadField
            onFileSelect={(file) => {
              setNewLeave({ ...newLeave, document: file });
              setSelectedFileName(file ? file.name : "");
            }}
            selectedFileName={selectedFileName}
          />

          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-500 transition-colors shadow-sm mt-4"
          >
            Submit Request
          </button>
        </form>
      </div>

      {/* Pending Leave Requests */}
      <div className="mb-8 bg-gray-50 p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Pending Leave Requests</h2>
        {pendingLeaves.length === 0 ? (
          <p className="text-gray-700">No pending leave requests.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-800">
                <th className="border p-2">Type</th>
                <th className="border p-2">Start</th>
                <th className="border p-2">End</th>
                <th className="border p-2">Duration</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Document</th>
              </tr>
            </thead>
            <tbody>
              {pendingLeaves.map((lv) => (
                <tr key={lv.id} className="hover:bg-gray-100">
                  <td className="border p-2">{lv.leave_type}</td>
                  <td className="border p-2">
                    {lv.start_date} {lv.start_time}
                  </td>
                  <td className="border p-2">
                    {lv.end_date} {lv.end_time}
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

      {/* Past Leave Requests */}
      <div className="bg-gray-50 p-6 rounded shadow">
        <h2 className="text-2xl font-semibold mb-4">Past Leave Requests</h2>
        {pastLeaves.length === 0 ? (
          <p className="text-gray-700">No past leave requests.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-800">
                <th className="border p-2">Type</th>
                <th className="border p-2">Start</th>
                <th className="border p-2">End</th>
                <th className="border p-2">Duration</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Description</th>
                <th className="border p-2">Document</th>
              </tr>
            </thead>
            <tbody>
              {pastLeaves.map((lv) => (
                <tr key={lv.id} className="hover:bg-gray-100">
                  <td className="border p-2">{lv.leave_type}</td>
                  <td className="border p-2">
                    {lv.start_date} {lv.start_time}
                  </td>
                  <td className="border p-2">
                    {lv.end_date} {lv.end_time}
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
