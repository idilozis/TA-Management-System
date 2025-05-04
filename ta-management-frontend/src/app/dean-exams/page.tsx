"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpenCheck } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Trash2 } from "lucide-react"
import apiClient from "@/lib/axiosClient"
import DeanExamModal from "./DeanExamModal"
import DeanProctorModal from "./DeanProctorModal"
import { Badge } from "@/components/ui/badge"

interface DeanExam {
  id: number
  course_codes: string[]
  date: string
  start_time: string
  end_time: string
  classrooms: string[]
  num_proctors: number
  student_count: number
  assigned_tas: string[]
}

export default function DeanExamsPage() {
  const { user, loading } = useUser()
  const [exams, setExams] = useState<DeanExam[]>([])
  const [refresh, setRefresh] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [toDelete, setToDelete] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [showProctor, setShowProctor]     = useState(false)
  const [currentProctorExam, setCurrentProctorExam] = useState<DeanExam | null>(null)

  useEffect(() => {
    apiClient
      .get("/exams/list-dean-exams/")
      .then((res) => {
        if (res.data.status === "success") {
          setExams(res.data.exams)
          setError("")
        } else {
          setError(res.data.message || "Failed to load exams")
        }
      })
      .catch(() => setError("Failed to fetch exams"))
  }, [refresh])

  const deleteExam = async () => {
    if (!toDelete) return
    try {
      await apiClient.post("/exams/delete-dean-exam/", { exam_id: toDelete })
      setRefresh((x) => x + 1)
    } catch {
      setError("Error deleting exam")
    } finally {
      setToDelete(null)
    }
  }

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-")
    return `${d}.${m}.${y}`
  }

  if (loading) return <PageLoader />
  if (!user) return <div className="min-h-screen flex items-center justify-center">Not signed in</div>

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
            <div className="flex items-center gap-2 mb-9">
                <BookOpenCheck className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold">Exams</h1>
            </div>
            <div className="flex justify-between items-center mb-6">
                <Button onClick={() => setShowModal(true)} className="bg-blue-700 hover:bg-blue-600">+ Exam</Button>
            </div>
            
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
              {error}
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {exams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No exams found.</div>
            ) : (
              <Card>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Courses</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Start - End</TableHead>
                          <TableHead>Rooms</TableHead>
                          <TableHead>Proctors</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exams.map((ex) => (
                          <TableRow key={ex.id} className="hover:bg-muted/30">
                            <TableCell>{ex.course_codes.join(", ")}</TableCell>
                            <TableCell>{fmtDate(ex.date)}</TableCell>
                            <TableCell>
                              {ex.start_time} - {ex.end_time}
                            </TableCell>
                            <TableCell>{ex.classrooms.join(", ")}</TableCell>
                            <TableCell>{ex.num_proctors}</TableCell>
                            <TableCell>{ex.student_count}</TableCell>
                            <TableCell className="flex gap-2">
                              {/* Delete */}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setToDelete(ex.id)}
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>

                              {/* Print */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500">Student List</Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-1 w-40">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start w-full"
                                    onClick={() =>
                                      window.open(
                                        `${apiClient.defaults.baseURL}/reports/studentlist-alphabetic/${ex.id}/`,
                                        "_blank"
                                      )
                                    }
                                  >
                                    Alphabetical
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start w-full"
                                    onClick={() =>
                                      window.open(
                                        `${apiClient.defaults.baseURL}/reports/studentlist-random/${ex.id}/`,
                                        "_blank"
                                      )
                                    }
                                  >
                                    Random
                                  </Button>
                                </PopoverContent>
                              </Popover>

                              {/* Show Proctor button only if no one’s assigned yet */}
                              {ex.assigned_tas.length === 0 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setCurrentProctorExam(ex)
                                  setShowProctor(true)
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                              >
                                Proctor
                              </Button>
                              ) : (
                                // otherwise, list them
                                <div className="space-y-1">
                                  {ex.assigned_tas.map((email) => (
                                    <Badge key={email} variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                      {email}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Delete Confirmation */}
          <AlertDialog
            open={toDelete !== null}
            onOpenChange={(open) => !open && setToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteExam}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* +Exam Modal */}
          {showModal && (
            <DeanExamModal
              onClose={() => {
                setShowModal(false)
                setRefresh((x) => x + 1)
              }}
            />
          )}
          {/* Proctoring Modal */}
          {showProctor && currentProctorExam && (
            <DeanProctorModal
              exam={currentProctorExam}
              onClose={() => setShowProctor(false)}
              onAssigned={() => setRefresh((x) => x + 1)}
            />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
