"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SettingsIcon, Save, UserCog } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import apiClient from "@/lib/axiosClient"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  const { user, loading } = useUser()

  // Password update
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>

  // Style helper for password messages
  const getMessageStyle = () => {
    if (!message) return ""
    return message.includes("❗") ? "destructive" : "bg-green-50 text-green-800 border-green-200"
  }

  // Save password changes
  const handleSave = async () => {
    setMessage("")
    if (!currentPassword) {
      setMessage("❗ Please enter your current password to proceed.")
      return
    }
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

    try {
      // Verify current password
      const verifyRes = await apiClient.post("/auth/verify-password/", {
        password: currentPassword,
      })
      if (verifyRes.data.status !== "success") {
        setMessage("❗ Current password is incorrect!")
        return
      }

      // Update password
      const res = await apiClient.post("/auth/update-profile/", {
        name: user.name,
        surname: user.surname,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setMessage(res.data.message || "✅ Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setMessage("❗ Update failed.")
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex flex-col space-y-6 w-full">
            <div className="flex items-center gap-2 mb-6">
              <UserCog className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <Separator className="my-4" />

            {/* Password message */}
            {message && (
              <Alert
                variant={message.includes("❗") ? "destructive" : undefined}
                className={!message.includes("❗") ? getMessageStyle() : ""}
              >
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* My Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">My Information</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">{user.name}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surname">Surname</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">{user.surname}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                      {user.isTA ? "Teaching Assistant" : "Staff"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Change Password</CardTitle>
                <CardDescription>Update your password every month to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full md:w-163"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} className="ml-auto bg-blue-600 text-white hover:bg-blue-700">
                  <Save className=" h-4 w-4" />
                  Update
                </Button>
              </CardFooter>
            </Card>

            {/* Admin-only settings */}
            <Card>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Semester</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">2024-2025 Spring</div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Workload for a TA</Label>
                    <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">60 Hours</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
