"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpenCheck, Pencil, Trash2, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import apiClient from "@/lib/axiosClient"
import DeanExamModal from "./DeanExamModal"
import DeanProctorModal from "./DeanProctorModal"
import EditDeanExamModal from "./EditDeanExamModal"

interface DeanExam {
  id: number
  course_codes: string[]
  date: string
  start_time: string
  end_time: string
  classrooms: string[]
  num_proctors: number
  student_count: number
  assigned_tas: Array<{
    email: string
    first_name: string
    last_name: string
  }>
  paid_proctoring?: boolean
}

export default function DeanExamsPage() {
  const { user, loading } = useUser()
  const [exams, setExams] = useState<DeanExam[]>([])
  const [refresh, setRefresh] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [toDelete, setToDelete] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [showProctor, setShowProctor] = useState(false)
  const [currentProctorExam, setCurrentProctorExam] = useState<DeanExam | null>(null)
  const [examToEdit, setExamToEdit] = useState<DeanExam | null>(null)
  const [showProctorsDialog, setShowProctorsDialog] = useState(false)
  const [selectedExamProctors, setSelectedExamProctors] = useState<
    Array<{ email: string; first_name: string; last_name: string }>
  >([])
  const [selectedExamName, setSelectedExamName] = useState<string>("")

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

  const handleEditExam = (exam: DeanExam) => {
    setExamToEdit(exam)
  }

  const handleEditClose = (refreshNeeded = false) => {
    setExamToEdit(null)
    if (refreshNeeded) {
      setRefresh((x) => x + 1)
    }
  }

  const handleShowProctors = (exam: DeanExam) => {
    setSelectedExamProctors(exam.assigned_tas)
    setSelectedExamName(exam.course_codes.join(", "))
    setShowProctorsDialog(true)
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
          

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {exams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No exams found.</div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-blue-600 mb-2">Manage Exams</CardTitle>
                      <CardDescription>Add exams, assign/de-assign proctors, and view student lists and proctors.</CardDescription>
                    </div>
                    <Button onClick={() => setShowModal(true)} className="bg-blue-700 hover:bg-blue-600">
                      + Exam
                    </Button>
                  </div>
                </CardHeader>
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
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <span>{ex.course_codes.join(", ")}</span>
                                {ex.paid_proctoring && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                    Paid Proctoring
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            
                            <TableCell>{fmtDate(ex.date)}</TableCell>
                            <TableCell>
                              {ex.start_time} - {ex.end_time}
                            </TableCell>
                            <TableCell>{ex.classrooms.join(", ")}</TableCell>
                            <TableCell>
                              {ex.assigned_tas.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowProctors(ex)}
                                  className="flex items-center gap-1"
                                >
                                  <Users className="h-4 w-4" />
                                  Check Proctors ({ex.assigned_tas.length})
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">None assigned</span>
                              )}
                            </TableCell>
                            <TableCell>{ex.student_count}</TableCell>
                            <TableCell className="flex gap-2">
                              {/* Edit */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditExam(ex)}
                                className="flex items-center gap-1"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </Button>

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
                                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                                    Student List
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-1 w-40">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start w-full"
                                    onClick={() =>
                                      window.open(
                                        `${apiClient.defaults.baseURL}/reports/studentlist-alphabetic/${ex.id}/`,
                                        "_blank",
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
                                        "_blank",
                                      )
                                    }
                                  >
                                    Random
                                  </Button>
                                </PopoverContent>
                              </Popover>

                              {/* Show Proctor button only if no one's assigned yet */}
                              {ex.assigned_tas.length === 0 && (
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
          <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteExam} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Proctors Dialog */}
          <Dialog open={showProctorsDialog} onOpenChange={setShowProctorsDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assigned Proctors for {selectedExamName}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {selectedExamProctors.length > 0 ? (
                <div className="space-y-2">
                  {selectedExamProctors.map((ta) => (
                    <div
                      key={ta.email}
                      className="p-2 bg-green-50 border border-green-200 rounded-md"
                    >
                      {ta.first_name} {ta.last_name} ({ta.email})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">No proctors assigned</p>
              )}
              </div>
            </DialogContent>
          </Dialog>

          {/* +Exam Modal */}
          {showModal && (
            <DeanExamModal
              onClose={() => {
                setShowModal(false)
                setRefresh((x) => x + 1)
              }}
            />
          )}

          {/* Edit Exam Modal */}
          {examToEdit && <EditDeanExamModal exam={examToEdit} onClose={handleEditClose} />}

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
