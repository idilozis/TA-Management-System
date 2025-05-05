"use client"

import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SettingsIcon, Save, UserCog } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import apiClient from "@/lib/axiosClient"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  const { user, loading } = useUser()
  
  const getRoleLabel = () => {
    if (user && user.isTA) return "Teaching Assistant"
    if (user && user.isAuth) {
      switch (user.role) {
        case "ADMIN":
          return "Administrator"
        case "CS SECRETARY":
          return "CS Secretary"
        case "IE SECRETARY":
          return "IE Secretary"
        case "EEE SECRETARY":
          return "EEE Secretary"
        case "ME SECRETARY":
          return "ME Secretary"
        case "DEAN":
          return "Dean Office"
        default:
          return user.role
      }
    }
    return "Instructor"
  }
  const roleLabel = getRoleLabel()

  // Global settings state
  const [semester, setSemester] = useState("")
  const [workload, setWorkload] = useState<number | "">("")
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Feedback message
  const [message, setMessage] = useState("")

  // Load global settings on mount
  useEffect(() => {
    if (!user) return
    // setLoadingSettings(true)
    apiClient
      .get("/list/global-settings/")
      .then((res) => {
        if (res.data.status === "success") {
          setSemester(res.data.settings.current_semester)
          setWorkload(res.data.settings.max_ta_workload)
        } else {
          setMessage("❗ Failed to load settings.")
        }
      })
      .catch(() => setMessage("❗ Failed to load settings."))
      .finally(() => setLoadingSettings(false))
  }, [user])

  if (loading || loadingSettings) return <PageLoader />
  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        No user found.
      </div>
    )

  const isAdmin = user.role === "ADMIN"

  // Helper for styling alerts
  const alertVariant = message.startsWith("❗") ? "destructive" : undefined

  // Handle password update
  const handleSavePassword = async () => {
    setMessage("")
    if (!currentPassword) {
      setMessage("❗ Please enter your current password.")
      return
    }
    if (!newPassword || !confirmPassword) {
      setMessage("❗ Please fill in new password fields.")
      return
    }
    if (newPassword.length < 8) {
      setMessage("❗ New password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage("❗ New password and confirmation do not match.")
      return
    }
    try {
      // verify current
      const verify = await apiClient.post("/auth/verify-password/", {
        password: currentPassword,
      })
      if (verify.data.status !== "success") {
        setMessage("❗ Current password is incorrect.")
        return
      }
      // update
      const res = await apiClient.post("/auth/update-profile/", {
        name: user.name,
        surname: user.surname,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setMessage(res.data.message || "✅ Password updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setMessage("❗ Password update failed.")
    }
  }

  // Handle global settings save
  const handleSaveSettings = async () => {
    setMessage("")
    if (!semester.trim() || workload === "" || workload < 0) {
      setMessage("❗ Please enter valid semester and workload.")
      return
    }
    setSavingSettings(true)
    try {
      const res = await apiClient.post("/list/global-settings/", {
        current_semester: semester,
        max_ta_workload: workload,
      })
      if (res.data.status === "success") {
        setMessage("✅ Settings updated.")
      } else {
        setMessage("❗ Update failed.")
      }
    } catch {
      setMessage("❗ Update failed.")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex flex-col space-y-6 w-full">
            <div className="flex items-center gap-2 mb-6">
              <UserCog className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <Separator />

            {message && (
              <Alert variant={alertVariant}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* --- My Information --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">My Information</CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ["Name", user.name],
                    ["Surname", user.surname],
                    ["Email", user.email],
                    ["Role", roleLabel],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-1">
                      <Label>{label}</Label>
                      <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* --- Change Password --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Change Password</CardTitle>
                <CardDescription>
                  Update your password regularly for security
                </CardDescription>
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
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSavePassword}
                  className="ml-auto bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Password
                </Button>
              </CardFooter>
            </Card>

            {/* --- Global Settings (Admin Only) --- */}
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Global Settings</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Edit semester & workload"
                    : "Current semester & TA workload"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester">Current Semester</Label>
                    {isAdmin ? (
                      <Input
                        id="semester"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                        {semester}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workload">Max TA Workload (hrs)</Label>
                    {isAdmin ? (
                      <Input
                        id="workload"
                        type="number"
                        min={0}
                        value={workload}
                        onChange={(e) =>
                          setWorkload(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                      />
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/20 text-muted-foreground">
                        {workload} hrs
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              {isAdmin && (
                <CardFooter>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="ml-auto bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingSettings ? "Saving…" : "Save Settings"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
