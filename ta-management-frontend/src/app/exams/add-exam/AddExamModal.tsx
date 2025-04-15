"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import apiClient from "@/lib/axiosClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, X } from "lucide-react"

interface AddExamModalProps {
  onClose: () => void
}

interface CourseOption {
  id: number
  code: string
  name: string
}

export default function AddExamModal({ onClose }: AddExamModalProps) {
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [numProctors, setNumProctors] = useState(1)
  const [classroomName, setClassroomName] = useState("")
  const [studentCount, setStudentCount] = useState(0)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch staff's courses
  useEffect(() => {
    apiClient
      .get("/exams/list-courses/")
      .then((res) => {
        if (res.data.status === "success") {
          setCourses(res.data.courses)
        }
      })
      .catch((err) => {
        console.error("Error fetching staff courses:", err)
        setError("Failed to load courses. Please try again.")
      })
  }, [])

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setMessage("")

    // Basic validations
    if (!selectedCourse || !date || !startTime || !endTime || !classroomName) {
      setError("Please fill in all required fields.")
      setIsSubmitting(false)
      return
    }

    if (startTime >= endTime) {
      setError("Start time must be before end time.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await apiClient.post("/exams/create-exam/", {
        course_id: selectedCourse,
        date,
        start_time: startTime,
        end_time: endTime,
        num_proctors: numProctors,
        classroom_name: classroomName,
        student_count: studentCount,
      })

      if (response.data.status === "success") {
        setMessage(response.data.message || "Exam created successfully!")
        // Reset form
        setSelectedCourse("")
        setDate("")
        setStartTime("")
        setEndTime("")
        setNumProctors(1)
        setClassroomName("")
        setStudentCount(0)

        // Close the modal after a short delay
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(response.data.message || "Error creating exam")
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating exam. Please try again.")
      console.error("Error creating exam:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Modal content */}
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-blue-600 border-2">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Add Exam</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {message && (
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleCreateExam} className="space-y-4">
                {/* Course selection */}
                <div className="space-y-2">
                  <Label htmlFor="course">
                    Course <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>

                {/* Time fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">
                      Start Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">
                      End Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Classroom Name */}
                <div className="space-y-2">
                  <Label htmlFor="classroomName">
                    Classroom Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="classroomName"
                    type="text"
                    value={classroomName}
                    onChange={(e) => setClassroomName(e.target.value)}
                    required
                    placeholder="e.g., Room 101"
                  />
                </div>

                {/* Number fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numProctors">Number of Proctors</Label>
                    <Input
                      id="numProctors"
                      type="number"
                      min={1}
                      value={numProctors}
                      onChange={(e) => setNumProctors(Number.parseInt(e.target.value, 10) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentCount">Student Count</Label>
                    <Input
                      id="studentCount"
                      type="number"
                      min={0}
                      value={studentCount}
                      onChange={(e) => setStudentCount(Number.parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500">
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
