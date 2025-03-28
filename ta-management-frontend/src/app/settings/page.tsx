"use client"

import { useState, useEffect } from "react"
import apiClient from "@/lib/axiosClient"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/app-sidebar"
import type { UserData } from "@/components/general/settings"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    apiClient
      .get("/auth/whoami/")
      .then((response) => {
        if (response.data.status === "success") {
          const userData = response.data.user
          setUser(userData)
          setName(userData.name || "")
          setSurname(userData.surname || "")
        } else {
          router.push("/login")
        }
      })
      .catch(() => {
        router.push("/login")
      })
  }, [router])

  const handleSave = async () => {
    setMessage("")

    // --- Validation ---
    if (!name.trim() || !surname.trim()) {
      setMessage("❗ Name and surname cannot be empty!")
      return
    }

    if (newPassword || confirmPassword) {
      if (!newPassword || !confirmPassword) {
        setMessage("❗ Please fill both new password fields!")
        return
      }

      if (newPassword.length < 8) {
        setMessage("❗ New password must be at least 8 characters!")
        return
      }

      if (newPassword !== confirmPassword) {
        setMessage("❗ New password and confirmation do not match!")
        return
      }
    }

    // --- Verify Current Password ---
    if (currentPassword) {
      try {
        const verifyRes = await apiClient.post("/auth/verify-password/", {
          password: currentPassword,
        })

        if (verifyRes.data.status !== "success") {
          setMessage("❗ Current password is incorrect!")
          return
        }
      } catch {
        setMessage("❗ Error verifying current password.")
        return
      }
    } else {
      setMessage("❗ Please enter your current password to proceed.")
      return
    }

    // --- Prepare Payload ---
    const payload: {
      name: string
      surname: string
      current_password?: string
      new_password?: string
      confirm_password?: string
    } = {
      name,
      surname,
      current_password: currentPassword,
    }

    if (newPassword) {
      payload.new_password = newPassword
      payload.confirm_password = confirmPassword
    }

    // --- Send Update Request ---
    try {
      const response = await apiClient.post("/auth/update-profile/", payload)
      setMessage(response.data.message || "✅ Profile updated successfully!")

      // Clear password fields after successful update
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setMessage("❗ Update failed.")
    }
  }

  if (!user) {
    return <div className="text-white">Loading...</div>
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-black text-white">
        <AppSidebar user={user} onSettingsClick={() => setShowSettings(true)} />

        <SidebarInset className="bg-black p-0">
          <div className="flex min-h-screen flex-col">
            {/* Main content */}
            <div className="flex-1 p-8">
              <h1 className="mb-6 text-4xl font-bold">Settings</h1>

              <Separator className="mb-8 bg-zinc-800" />

              {message && (
                <div
                  className={`mb-6 rounded p-3 ${
                    message.includes("❗") ? "bg-red-900/30 text-red-200" : "bg-green-900/30 text-green-200"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* Personal Settings Section */}
              <div className="mb-12">
                <h2 className="mb-6 text-2xl font-semibold">Personal Settings</h2>

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
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Your current password</label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">Enter your current password to proceed.</p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">New password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">Enter your new password.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Confirm New password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-zinc-800 bg-zinc-900 text-white"
                        placeholder="••••••"
                      />
                      <p className="text-xs text-zinc-500">Confirm your new password.</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
                      Change your password
                    </Button>
                  </div>
                </div>
              </div>

              {/* Reports Section */}
              <div className="mb-12">
                <h2 className="mb-6 text-2xl font-semibold">Reports</h2>

                <div className="max-w-3xl">
                  <Button className="mb-6 bg-blue-600 text-white hover:bg-blue-700">
                    Download Log <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <div className="mb-6 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm">
                      Fall 2025 <span className="ml-2 cursor-pointer">×</span>
                    </Badge>
                    <Badge variant="outline" className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm">
                      Spring 2025 <span className="ml-2 cursor-pointer">×</span>
                    </Badge>
                    <Badge variant="outline" className="rounded-full bg-transparent border-zinc-700 px-3 py-1 text-sm">
                      {user.name} {user.surname} <span className="ml-2 cursor-pointer">×</span>
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700">
                      Download Total Proctoring Sheet
                    </Button>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700">Download Total TA Duty Sheet</Button>
                  </div>
                </div>
              </div>

              {/* Admin Settings Section - Only show if user is admin */}
              {user.isTA === false && (
                <div>
                  <h2 className="mb-6 text-2xl font-semibold">Admin Settings</h2>

                  <div className="max-w-3xl grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Current Semester</label>
                      <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-white">Fall 2025</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">Max Workload for a TA</label>
                      <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-white">50 Hours</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

