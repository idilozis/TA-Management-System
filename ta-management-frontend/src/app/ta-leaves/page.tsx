"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import TALeaveTA from "./ta-ui/TALeaveTA"

export default function TALeavePage() {
  const { user, loading } = useUser()
  const [activeTab, setActiveTab] = useState<"leave">("leave")

  // Determine if the leave tab should be shown
  const showLeaveTab = user?.isTA || (user && user.isAuth) // TAs and Authorized users

  // Set default active tab based on user type
  useEffect(() => {
    if (user && showLeaveTab) {
      setActiveTab("leave")
    }
  }, [user, showLeaveTab])

  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center">No user found.</div>

  const renderContent = () => {
    // For leave tab
    if (activeTab === "leave") {
      if (user.isTA) return <TALeaveTA />
      return null
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8 w-full">

          {renderContent()}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
