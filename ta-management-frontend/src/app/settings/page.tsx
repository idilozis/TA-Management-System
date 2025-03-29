"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ArrowRight } from "lucide-react";
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

  // Local state for editing
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // Once user data arrives, initialize name/surname
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setSurname(user.surname || "");
    }
  }, [user]);

  // If still loading, show a placeholder
  if (loading) {
    return <div className="text-white">Loading user data...</div>;
  }

  // If we have no user after loading
  if (!user) {
    return <div className="text-white">No user found</div>;
  }

  // Save changes
  const handleSave = async () => {
    setMessage("");

    // Basic validation
    if (!name.trim() || !surname.trim()) {
      setMessage("❗ Name and surname cannot be empty!");
      return;
    }

    if (newPassword || confirmPassword) {
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
    }

    if (!currentPassword) {
      setMessage("❗ Please enter your current password to proceed.");
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

    // Build payload
    const payload: {
      name: string;
      surname: string;
      current_password: string;
      new_password?: string;
      confirm_password?: string;
    } = {
      name,
      surname,
      current_password: currentPassword,
    };

    if (newPassword) {
      payload.new_password = newPassword;
      payload.confirm_password = confirmPassword;
    }

    // Send update request
    try {
      const response = await apiClient.post("/auth/update-profile/", payload);
      setMessage(response.data.message || "✅ Profile updated successfully!");

      // Re-render with new name/surname with no need to refreshing of the page
      setUser((prevUser) => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          name,
          surname,
        };
      });

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("❗ Update failed.");
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} /> {/* SIDEBAR */}

        <SidebarInset className="bg-black p-0">
          <div className="flex min-h-screen flex-col">
            {/* Main Content */}
            <div className="flex-1 p-8">
              <h1 className="mb-6 text-4xl font-bold">Settings</h1>

              <Separator className="mb-8 bg-zinc-800" />

              {message && (
                <div
                  className={`mb-6 rounded p-3 ${
                    message.includes("❗")
                      ? "bg-red-900/30 text-red-200"
                      : "bg-green-900/30 text-green-200"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Personal Settings Section */}
              <div className="mb-12">
                <h2 className="mb-6 text-2xl font-semibold">My Information</h2>

                <div className="max-w-3xl space-y-6">
                  {/* Name and Surname fields */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Name</label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Surname</label>
                      <Input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </div>
                  </div>

                  {/* Password fields */}
                  {/* CURRENT PASSWORD */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">
                        Enter your current password to proceed.
                      </p>
                    </div>
                  </div>

                  {/* NEW PASSWORD */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">
                        Enter your new password.
                      </p>
                    </div>

                    {/* CONFIRM NEW PASSWORD */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">
                        Confirm your new password.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={handleSave}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Update Info
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reports Section */}
              <div className="mb-12">
                <h2 className="mb-6 text-2xl font-semibold">Reports</h2>

                <div className="max-w-3xl">
                  <Button asChild className="mb-6 bg-blue-600 text-white hover:bg-blue-700">
                    {/* If button is clicked, direct to proctoring folder's page.tsx */}
                    <Link href="/reports"> 
                      Download Log <ArrowRight className="ml-2 h-4 w-4" />
                    </Link> 
                  </Button>

                  <div className="mb-6 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm"
                    >
                      Fall 2025 <span className="ml-2 cursor-pointer">×</span>
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm"
                    >
                      Spring 2025 <span className="ml-2 cursor-pointer">×</span>
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm"
                    >
                      {user.name} {user.surname}{" "}
                      <span className="ml-2 cursor-pointer">×</span>
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

              {/* Admin Settings Section - Only show if user is admin (show also to Staff for now) */}
              {user.isTA === false && (
                <div>
                  <h2 className="mb-6 text-2xl font-semibold">Admin Settings</h2>

                  {/* Current Semestr */}
                  <div className="max-w-3xl grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Current Semester
                      </label>
                      <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-white">
                        Fall 2025
                      </div>
                    </div>

                    {/* Max Workload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Max Workload for a TA
                      </label>
                      <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-white">
                        50 Hours
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );

}
