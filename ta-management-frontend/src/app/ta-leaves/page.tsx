// ta-leaves/page.tsx
"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"

// TA‐only leave page
import TALeaveTA from "./ta-ui/TALeaveTA"
// Secretary/Authorized leave page
import TALeaveAuthorized from "./staff-ui/TALeaveAuthorized"

export default function TALeavePage() {
  const { user, loading } = useUser()
  // Only one “leave” tab here, but we'll keep the same pattern
  const [activeTab] = useState<"leave">("leave")

  // showLeaveTab: TAs + any authorized user (SECRETARY, DEAN, ADMIN)
  const showLeaveTab = Boolean(user && (user.isTA || user.isAuth))

  // on mount, if they can see it, select it
  useEffect(() => {
    if (user && showLeaveTab) {
      // activeTab is already “leave”
    }
  }, [user, showLeaveTab])

  // Loading, not-logged-in states
  if (loading) return <PageLoader />
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      No user found.
    </div>
  )

  // If they shouldn’t even see this page, you could redirect or show a 403:
  if (!showLeaveTab) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Access denied.
      </div>
    )
  }

  const renderContent = () => {
    // Only one tab, but split by role:
    if (activeTab === "leave") {
      if (user.isTA) {
        // TAs see their own leave‐form/list
        return <TALeaveTA />
      }
      // Authorized users (non‐TA) see the approval dashboard
      if (user.isAuth) {
        return <TALeaveAuthorized />
      }
    }
    return null
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
