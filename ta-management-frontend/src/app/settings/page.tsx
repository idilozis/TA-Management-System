"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ArrowRight, SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import { PageLoader } from "@/components/ui/loading-spinner";
import apiClient from "@/lib/axiosClient";

/** Which button is downloading? "proctoring" | "taDuty" | "workload" | null */
type DownloadTarget = "proctoring" | "taDuty" | "workload" | null;

export default function SettingsPage() {
  const { user, loading } = useUser();

  // Password update
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // Track which button is currently downloading
  const [activeDownload, setActiveDownload] = useState<DownloadTarget>(null);

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900">
        No user found.
      </div>
    );

  // Style helper for password messages
  const getMessageStyle = () => {
    if (!message) return "";
    return message.includes("❗")
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800";
  };

  // Save password changes
  const handleSave = async () => {
    setMessage("");
    if (!currentPassword) {
      setMessage("❗ Please enter your current password to proceed.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      setMessage("❗ Please fill both new password fields!");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("❗ New password must be at least 8 characters!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("❗ New password and confirmation do not match!");
      return;
    }

    try {
      // Verify current password
      const verifyRes = await apiClient.post("/auth/verify-password/", {
        password: currentPassword,
      });
      if (verifyRes.data.status !== "success") {
        setMessage("❗ Current password is incorrect!");
        return;
      }

      // Update password
      const res = await apiClient.post("/auth/update-profile/", {
        name: user.name,
        surname: user.surname,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage(res.data.message || "✅ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("❗ Update failed.");
    }
  };

  // Download helper: sets activeDownload, fetches PDF, resets activeDownload
  const initiateDownload = async (
    endpoint: string,
    filename: string,
    target: DownloadTarget
  ): Promise<void> => {
    try {
      setActiveDownload(target);

      const response = await apiClient.get(endpoint, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setActiveDownload(null);
    }
  };

  // Each button triggers one download
  const handleDownloadProctoring = () => {
    initiateDownload("/reports/download-total-proctoring-sheet/", "total_proctoring.pdf", "proctoring");
  };
  const handleDownloadTADuty = () => {
    initiateDownload("/reports/download-total-ta-duty-sheet/", "total_ta_duties.pdf", "taDuty");
  };
  const handleDownloadWorkload = () => {
    initiateDownload("/reports/download-total-workload-sheet/", "TA Workload.pdf", "workload");
  };

  // Animated style only while that button is active
  const animatedStyle = {
    background: `
      repeating-linear-gradient(
        45deg,
        #0dba85,
        #0dba85 10px,
        #33c499 10px,
        #33c499 20px
      )
    `,
    backgroundSize: "200% 200%",
    animation: "stripeSlide 20s linear infinite",
  };
  // Otherwise, a plain green background
  const staticStyle = {
    backgroundColor: "#0dba85", // #155dff (for blue)
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />
        <SidebarInset className="bg-white p-8">
          <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" /> Settings
          </h1>
          <Separator className="mb-8 bg-gray-200" />

          {/* Password message */}
          {message && (
            <div className={`mb-6 rounded p-3 ${getMessageStyle()}`}>
              {message}
            </div>
          )}

          {/* My Information */}
          <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
            <h2 className="mb-6 text-2xl font-semibold">My Information</h2>
            <div className="max-w-3xl grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-800">Name</label>
                <div className="p-2 border border-gray-300 bg-white text-gray-900">
                  {user.name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-800">Surname</label>
                <div className="p-2 border border-gray-300 bg-white text-gray-900">
                  {user.surname}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
            <h2 className="mb-6 text-2xl font-semibold">Change Password</h2>
            <div className="max-w-3xl space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800">
                  Current Password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <Button
                onClick={handleSave}
                className="mt-6 bg-blue-600 text-white hover:bg-blue-700"
              >
                Update
              </Button>
            </div>
          </div>

          {/* Reports */}
          <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
            <h2 className="mb-6 text-2xl font-semibold">Reports</h2>

            {/* Show text if any button is active */}
            {activeDownload && (
              <div className="text-center mb-4 text-sm text-black">
                Downloading… This might take some time.
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-4">
              {/* Proctoring button: animate if activeDownload === 'proctoring' */}
              <Button
                onClick={handleDownloadProctoring}
                className="relative text-white font-semibold px-4 py-2 rounded overflow-hidden"
                style={activeDownload === "proctoring" ? animatedStyle : staticStyle}
              >
                Download Total Proctoring Sheet
              </Button>

              {/* TA Duty button: animate if activeDownload === 'taDuty' */}
              <Button
                onClick={handleDownloadTADuty}
                className="relative text-white font-semibold px-4 py-2 rounded overflow-hidden"
                style={activeDownload === "taDuty" ? animatedStyle : staticStyle}
              >
                Download Total TA Duty Sheet
              </Button>

              {/* Workload button: animate if activeDownload === 'workload' */}
              <Button
                onClick={handleDownloadWorkload}
                className="relative text-white font-semibold px-4 py-2 rounded overflow-hidden"
                style={activeDownload === "workload" ? animatedStyle : staticStyle}
              >
                Download TA Workload Sheet
              </Button>
            </div>
          </div>

          {/* Admin-only settings */}
          {user.isTA === false && (
            <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
              <div className="max-w-3xl grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Current Semester
                  </label>
                  <div className="rounded border border-gray-800 p-3">
                    2024-2025 Spring
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Max Workload for a TA
                  </label>
                  <div className="rounded border border-gray-800 p-3">
                    60 Hours
                  </div>
                </div>
              </div>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
