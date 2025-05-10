"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Repeat, ArrowUpDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import SwapModalStaff from "./SwapModalStaff"
import SwapTimeline from "@/app/staff-swaps/SwapTimeline"

interface Assignment {
  assignment_id: number
  ta_email: string
  ta_name: string
  course_code: string
  course_name: string
  date: string
  start_time: string
  end_time: string
  classrooms: string[]
  student_count: number
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

export default function StaffSwapsPage() {
  const { user, loading: userLoading } = useUser()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"assignments" | "history">("assignments")
  const [sortOrder, setSortOrder] = useState<"date" | "course">("date")

  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Assignment | null>(null)

  // compute today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const openModal = (row: Assignment) => {
    setSelected(row)
    setModalOpen(true)
  }

  const fetchAssignments = async (order: "date" | "course") => {
    setLoading(true)
    try {
      const res = await apiClient.get("/swap/all/", {
        params: { order_by: order },
      })
      if (res.data.status === "success") {
        setAssignments(res.data.assignments)
        setError("")
      } else {
        setError(res.data.message || "Failed to load assignments")
      }
    } catch {
      setError("Failed to fetch assignments")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === "assignments") fetchAssignments(sortOrder)
  }, [activeTab, sortOrder])

  if (userLoading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center">No user</div>

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-gray-100 text-gray-900">
        <AppSidebar user={user} />

        <SidebarInset className="bg-white p-8 w-full">
          <div className="flex items-center gap-2 mb-6">
            <Repeat className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Swaps</h1>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="mb-6">
              <TabsTrigger value="assignments" className="text-blue-600 font-medium">
                Proctoring Assignments
              </TabsTrigger>
              <TabsTrigger value="history" className="text-blue-600 font-medium">
                Swap History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-blue-600">All Proctoring Assignments</CardTitle>
                      <CardDescription>
                        Click <em>Swap</em> to replace the current TA.
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto">
                          <ArrowUpDown className="mr-2 h-4 w-4" />
                          Sort by: {sortOrder === "date" ? "Date" : "Course"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSortOrder("date")}>Sort by Date</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortOrder("course")}>Sort by Course</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <PageLoader />
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No assignments found</div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Classroom</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>TA</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {assignments.map((row) => {
                          // parse row.date and zero out time
                          const examDate = new Date(row.date);
                          examDate.setHours(0, 0, 0, 0);

                          return (
                            <TableRow key={row.assignment_id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">
                                <div>{row.course_code}</div>
                                {row.course_name && (
                                  <div className="text-sm text-muted-foreground">
                                    {row.course_name}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-800 border-blue-200"
                                >
                                  {formatDate(row.date)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {row.start_time} - {row.end_time}
                              </TableCell>
                              <TableCell>{row.classrooms.join(", ")}</TableCell>
                              <TableCell>{row.student_count}</TableCell>
                              <TableCell>{row.ta_name}</TableCell>
                              <TableCell className="text-right">
                                {examDate >= today && (
                                  <Button
                                    className="bg-blue-600 hover:bg-blue-500"
                                    size="sm"
                                    onClick={() => openModal(row)}
                                  >
                                    Swap
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Swap History</CardTitle>
                  <CardDescription>All completed swaps in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SwapTimeline />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {selected && (
            <SwapModalStaff
              open={modalOpen}
              onOpenChange={setModalOpen}
              assignment={selected}
              refresh={() => {
                if (activeTab === "assignments") fetchAssignments(sortOrder)
              }}
            />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
