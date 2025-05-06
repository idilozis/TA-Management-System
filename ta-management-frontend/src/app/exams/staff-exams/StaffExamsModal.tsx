"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { Card, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { Pencil, Trash2 } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import EditExamModal from "@/app/exams/edit-exam/EditExamModal"

interface Exam {
  id: number
  course_code: string
  course_name: string
  date: string
  start_time: string
  end_time: string
  classrooms: string[]
  num_proctors: number
  student_count: number
}

interface MyExamsProps {
  refreshTrigger?: number
}

export default function StaffExamsModal({ refreshTrigger }: MyExamsProps) {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [examToDelete, setExamToDelete] = useState<number | null>(null)
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null)

  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split("-")
    return `${day}.${month}.${year}`
  }

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get("/exams/list-exams/")
      if (response.data.status === "success") {
        const sortedExams = response.data.exams.sort(
          // Sort for most recent date to appear first.
          (a: Exam, b: Exam) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        setExams(sortedExams)
        setError("")
      } else {
        setError(response.data.message || "Failed to load exams")
      }
    } catch {
      setError("Failed to fetch exams")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExams()
  }, [refreshTrigger])

  const handleDeleteExam = async () => {
    if (!examToDelete) return

    try {
      await apiClient.post("/exams/delete-exam/", { exam_id: examToDelete })
      fetchExams()
    } catch {
      setError("Error deleting exam. Please try again.")
    } finally {
      setExamToDelete(null)
    }
  }

  const handleEditExam = (exam: Exam) => {
    setExamToEdit(exam)
  }

  const handleEditClose = (refreshNeeded = false) => {
    setExamToEdit(null)
    if (refreshNeeded) {
      fetchExams()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          {error && <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-md border border-red-200">{error}</div>}

          {exams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No exams found.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-semibold whitespace-nowrap">Course</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Date</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Start - End</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Classroom</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Proctors</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Students</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium whitespace-nowrap">
                        {exam.course_code} - {exam.course_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(exam.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {exam.start_time} - {exam.end_time}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{exam.classrooms.join(", ")}</TableCell>
                      <TableCell className="whitespace-nowrap">{exam.num_proctors}</TableCell>
                      <TableCell className="whitespace-nowrap">{exam.student_count}</TableCell>

                      <TableCell className="whitespace-nowrap flex items-center gap-2">
                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setExamToDelete(exam.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>

                        {/* Edit */}
                        <Button variant="outline" size="sm" onClick={() => handleEditExam(exam)} className="flex items-center gap-1">
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                         {/* Print dropdown */}
                         <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                              Student List
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start w-full"
                              onClick={() =>
                                window.open(
                                  `${apiClient.defaults.baseURL}/reports/studentlist-alphabetic/${exam.id}/`,
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
                                  `${apiClient.defaults.baseURL}/reports/studentlist-random/${exam.id}/`,
                                  "_blank",
                                )
                              }
                            >
                              Random
                            </Button>
                          </PopoverContent>
                        </Popover>

                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={examToDelete !== null} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this exam?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExam} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Exam Modal */}
      {examToEdit && <EditExamModal exam={examToEdit} onClose={handleEditClose} />}
    </>
  )
}
