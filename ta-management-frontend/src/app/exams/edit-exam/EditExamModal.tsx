"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import apiClient from "@/lib/axiosClient"

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

interface Course {
  id: number
  code: string
  name: string
}

interface EditExamModalProps {
  exam: Exam
  onClose: (refreshNeeded?: boolean) => void
}

export default function EditExamModal({ exam, onClose }: EditExamModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [classrooms, setClassrooms] = useState<string[]>([])

  // Form state
  const [courseId, setCourseId] = useState<number | null>(null)
  const [date, setDate] = useState(exam.date)
  const [startTime, setStartTime] = useState(exam.start_time)
  const [endTime, setEndTime] = useState(exam.end_time)
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(exam.classrooms)
  const [numProctors, setNumProctors] = useState(exam.num_proctors)
  const [studentCount, setStudentCount] = useState(exam.student_count)

  // Fetch courses and classrooms on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch courses
        const coursesResponse = await apiClient.get("/exams/list-courses/")
        if (coursesResponse.data.status === "success") {
          setCourses(coursesResponse.data.courses)

          // Find the course ID for the current exam
          const currentCourse = coursesResponse.data.courses.find((c: Course) => c.code === exam.course_code)
          if (currentCourse) {
            setCourseId(currentCourse.id)
          }
        }

        // Fetch classrooms
        const classroomsResponse = await apiClient.get("/exams/list-classrooms/")
        if (classroomsResponse.data.status === "success") {
          setClassrooms(classroomsResponse.data.classrooms)
        }
      } catch (err) {
        setError("Failed to load data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [exam])

  const handleClassroomToggle = (classroom: string) => {
    setSelectedClassrooms((prev) =>
      prev.includes(classroom) ? prev.filter((c) => c !== classroom) : [...prev, classroom],
    )
  }

  const handleSubmit = async () => {
    if (!courseId) {
      setError("Please select a course")
      return
    }

    if (selectedClassrooms.length === 0) {
      setError("Please select at least one classroom")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const response = await apiClient.post("/exams/update-exam/", {
        exam_id: exam.id,
        course_id: courseId,
        date,
        start_time: startTime,
        end_time: endTime,
        classrooms: selectedClassrooms,
        num_proctors: numProctors,
        student_count: studentCount,
      })

      if (response.data.status === "success") {
        setSuccess("Exam updated successfully!")
        setTimeout(() => {
          onClose(true) // Close with refresh needed
        }, 1500)
      } else {
        setError(response.data.message || "Failed to update exam")
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred while updating the exam")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Exam</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            Loading...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                type="text"
                value={`${exam.course_code} - ${exam.course_name}`}
                disabled
                className="cursor-not-allowed bg-gray-100 text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Classrooms</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {classrooms.map((classroom) => (
                  <div key={classroom} className="flex items-center space-x-2">
                    <Checkbox
                      id={`classroom-${classroom}`}
                      checked={selectedClassrooms.includes(classroom)}
                      onCheckedChange={() => handleClassroomToggle(classroom)}
                    />
                    <Label htmlFor={`classroom-${classroom}`}>{classroom}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numProctors">Number of Proctors</Label>
                <Input
                  id="numProctors"
                  type="text"
                  value="Delete Exam to Reassign"
                  disabled
                  className="cursor-not-allowed bg-gray-100 text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentCount">Student Count</Label>
                <Input
                  id="studentCount"
                  type="number"
                  min="0"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number.parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading} className="bg-blue-600 hover:bg-blue-500">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
