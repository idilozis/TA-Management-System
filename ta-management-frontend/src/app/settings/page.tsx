"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ArrowRight, SettingsIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/general/app-sidebar";
import { useUser } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";
import Link from "next/link"; 

export default function SettingsPage() {
  // Get user from custom hook
  const { user, setUser, loading } = useUser();

  // Local state for password fields only
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // If still loading user data, show a placeholder
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

  // Save changes: now for updating password only
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

    // Verify current password
    try {
      const verifyRes = await apiClient.post("/auth/verify-password/", {
        password: currentPassword,
      });
      if (verifyRes.data.status !== "success") {
        setMessage("❗ Current password is incorrect!");
        return;
      }
    } catch {
      setMessage("❗ Error verifying current password.");
      return;
    }

    // Build payload: pass unchanged name/surname from user
    const payload = {
      name: user.name,
      surname: user.surname,
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };

    // Send update request
    try {
      const response = await apiClient.post("/auth/update-profile/", payload);
      setMessage(response.data.message || "✅ Password updated successfully!");
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("❗ Update failed.");
    }
  };

  // Helper to style the message box
  const getMessageStyle = () => {
    if (!message) return "";
    return message.includes("❗")
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800";
  };

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Main layout with a light background */}
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />

        {/* Main content container */}
        <SidebarInset className="bg-white p-8">
          <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-blue-600" /> Settings
          </h1>
          
          <Separator className="mb-8 bg-gray-200" />
          {message && (
            <div className={`mb-6 rounded p-3 ${getMessageStyle()}`}>
              {message}
            </div>
          )}

          {/* MY INFORMATION (non-editable) */}
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

          {/* PASSWORD UPDATE */}
          <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
            <h2 className="mb-6 text-2xl font-semibold">Change Password</h2>
            <div className="max-w-3xl space-y-6">
              {/* NEW PASSWORD */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-gray-300 bg-white text-gray-900"
                    placeholder="••••••"
                  />
                  <p className="text-xs text-gray-600">
                    Enter your new password.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="border-gray-300 bg-white text-gray-900"
                    placeholder="••••••"
                  />
                  <p className="text-xs text-gray-600">
                    Confirm your new password.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* CURRENT PASSWORD */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-800">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-gray-300 bg-white text-gray-900"
                      placeholder="••••••"
                    />
                    <p className="text-xs text-gray-600">
                      Enter your current password to proceed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>

          {/* REPORTS */}
          <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
            <h2 className="mb-6 text-2xl font-semibold">Reports</h2>
            <div className="max-w-3xl space-y-6">
              <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                <Link href="/reports">
                  Download Log <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full bg-transparent border-gray-800 px-3 py-1 text-sm text-gray-800"
                >
                  2024-2025 Spring <span className="ml-2 cursor-pointer">×</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full bg-transparent border-gray-800 px-3 py-1 text-sm text-gray-800"
                >
                  {user.name} {user.surname} <span className="ml-2 cursor-pointer">×</span>
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Download Total Proctoring Sheet
                </Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Download Total TA Duty Sheet
                </Button>
              </div>
            </div>
          </div>

          {/* ADMIN SETTINGS (shown only if user is not a TA) */}
          {user.isTA === false && (
            <div className="mb-12 bg-gray-50 p-6 rounded shadow border border-gray-800">
              <h2 className="mb-6 text-2xl font-semibold">Admin Settings</h2>
              <div className="max-w-3xl grid gap-6 md:grid-cols-2">
                {/* Current Semester */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Current Semester
                  </label>
                  <div className="rounded border border-gray-800 bg-white p-3 text-gray-900">
                    2024-2025 Spring 
                  </div>
                </div>
                {/* Max Workload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-800">
                    Max Workload for a TA
                  </label>
                  <div className="rounded border border-gray-800 bg-white p-3 text-gray-900">
                    50 Hours
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
