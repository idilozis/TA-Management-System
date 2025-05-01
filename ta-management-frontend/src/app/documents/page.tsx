"use client"

import { useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Download, BarChart, FileSpreadsheet, FileDown,  FolderArchive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import apiClient from "@/lib/axiosClient"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

/** Which button is downloading? "proctoring" | "taDuty" | "workload" | null */
type DownloadTarget = "proctoring" | "taDuty" | "workload" | null

export default function ReportsPage() {
  const { user, loading } = useUser()

  // Track which button is currently downloading
  const [activeDownload, setActiveDownload] = useState<DownloadTarget>(null)
  // Track download progress (simulated)
  const [downloadProgress, setDownloadProgress] = useState(0)

  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-background">No user found.</div>

  // Download helper: sets activeDownload, simulates progress, fetches PDF, resets
  const initiateDownload = async (endpoint: string, filename: string, target: DownloadTarget): Promise<void> => {
    try {
      setActiveDownload(target)
      setDownloadProgress(0)

      // Simulate progress (harcoded)
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          const newProgress = prev + Math.random() * 6
          return newProgress >= 99 ? 99 : newProgress // Cap at 99% until actual download completes
        })
      }, 150)

      const response = await apiClient.get(endpoint, { responseType: "blob" })

      // Complete progress
      clearInterval(progressInterval)
      setDownloadProgress(100)

      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Keep 100% progress for a moment before resetting
      setTimeout(() => {
        setActiveDownload(null)
        setDownloadProgress(0)
      }, 1500)
    } catch (err) {
      console.error("Download error:", err)
      setActiveDownload(null)
      setDownloadProgress(0)
    }
  }

  // Each button triggers one download, so simultaneous downloads are possible but wont show progress bar for both
  const handleDownloadProctoring = () => {
    initiateDownload("/reports/download-total-proctoring-sheet/", "total_proctoring.pdf", "proctoring")
  }

  const handleDownloadTADuty = () => {
    initiateDownload("/reports/download-total-ta-duty-sheet/", "total_ta_duties.pdf", "taDuty")
  }

  const handleDownloadWorkload = () => {
    initiateDownload("/reports/download-total-workload-sheet/", "TA Workload.pdf", "workload")
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-9">
            <FolderArchive className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Reports</h1>
          </div>
     
          {/* "About" section */}
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold text-blue-800 mb-4">About Reports</h2>
            <p className="text-gray-700 mb-2 mt-2">
              Reports are generated automatically based on the current semester's data. They provide comprehensive
              information about TA assignments, duties, and workload distribution, and they are updated in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10">
            <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardHeader className="bg-amber-400 text-white pb-8">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-7 w-7" />
                  Proctoring Report
                </CardTitle>
                <CardDescription className="text-white text-base">
                  Total proctoring assignments and hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative">
                <div className="absolute -top-10 right-4 bg-amber-200 p-3 rounded-full shadow-md">
                  <BarChart className="h-8 w-8 text-amber-700" />
                </div>
                <p className="text-base text-gray-600 mb-4">
                  This report contains all proctoring assignments, TA allocations, and total hours for the current
                  semester.
                </p>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <FileDown className="h-3 w-3" />
                  PDF Format • Updated daily
                </div>
              </CardContent>
              <CardFooter>
                {activeDownload === "proctoring" ? (
                  <div className="w-full space-y-2">
                    <Progress
                      value={downloadProgress}
                      className="h-2 w-full bg-green-100"
                      indicatorColor="bg-green-500"
                    />
                    <span className="text-sm text-gray-500">Downloading... {Math.round(downloadProgress)}%</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleDownloadProctoring}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download Report
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100">
              <CardHeader className="bg-rose-400 text-white pb-8">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-7 w-7" />
                  TA Duty Report
                </CardTitle>
                <CardDescription className="text-white text-base">Comprehensive TA duty assignments</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative">
                <div className="absolute -top-10 right-4 bg-rose-200 p-3 rounded-full shadow-md">
                  <BarChart className="h-8 w-8 text-rose-700" />
                </div>
                <p className="text-base text-gray-600 mb-4">
                  This report summarizes all TA duties, including labs, office hours, and grading assignments.
                </p>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <FileDown className="h-3 w-3" />
                  PDF Format • Updated daily
                </div>
              </CardContent>
              <CardFooter>
                {activeDownload === "taDuty" ? (
                  <div className="w-full space-y-2">
                    <Progress
                      value={downloadProgress}
                      className="h-2 w-full bg-green-100"
                      indicatorColor="bg-green-500"
                    />
                    <span className="text-sm text-gray-500">Downloading... {Math.round(downloadProgress)}%</span>
                  </div>
                ) : (
                  <Button onClick={handleDownloadTADuty} className="w-full bg-rose-400 hover:bg-rose-500 text-white">
                    <Download className="mr-2 h-4 w-4" /> Download Report
                  </Button>
                )}
              </CardFooter>
            </Card>

            <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="bg-violet-400 text-white pb-8">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-7 w-7" />
                  Workload Report
                </CardTitle>
                <CardDescription className="text-white text-base">
                  TA workload distribution and analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative">
                <div className="absolute -top-10 right-4 bg-violet-200 p-3 rounded-full shadow-md">
                  <BarChart className="h-8 w-8 text-violet-700" />
                </div>
                <p className="text-base text-gray-600 mb-4">
                  This report provides a detailed breakdown of TA workload, balancing, and allocation across
                  courses.
                </p>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <FileDown className="h-3 w-3" />
                  PDF Format • Updated daily
                </div>
              </CardContent>
              <CardFooter>
                {activeDownload === "workload" ? (
                  <div className="w-full space-y-2">
                    <Progress
                      value={downloadProgress}
                      className="h-2 w-full bg-green-100"
                      indicatorColor="bg-green-500"
                    />
                    <span className="text-sm text-gray-500">Downloading... {Math.round(downloadProgress)}%</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleDownloadWorkload}
                    className="w-full bg-violet-400 hover:bg-violet-500 text-white"
                  >
                    <Download className="mr-2 h-4 w-4" /> Download Report
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
