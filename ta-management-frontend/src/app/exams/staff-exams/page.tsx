"use client"

import StaffExamsModal from "@/app/exams/staff-exams/StaffExamsModal"
import { motion } from "framer-motion"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"

export default function MyExamsPage() {
  const { user, loading } = useUser()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <h1 className="text-3xl font-bold mb-6">My Exams</h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <StaffExamsModal />
          </motion.div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
