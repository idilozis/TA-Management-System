"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import apiClient from "@/lib/axiosClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, X as XIcon } from "lucide-react"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface AddExamModalProps {
  onClose: () => void
}

interface CourseOption {
  id: number
  code: string
  name: string
}

export default function AddExamModal({ onClose }: AddExamModalProps) {
  // server data
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [classroomOptions, setClassroomOptions] = useState<string[]>([])

  // form state
  const [selectedCourse, setSelectedCourse] = useState("")
  const [date, setDate]             = useState("")
  const [startTime, setStartTime]   = useState("")
  const [endTime, setEndTime]       = useState("")
  const [numProctors, setNumProctors] = useState(1)
  const [classrooms, setClassrooms] = useState<string[]>([])
  const [classroomQuery, setClassroomQuery] = useState("")
  const [studentCount, setStudentCount] = useState(0)

  // UI state
  const [message, setMessage]   = useState("")
  const [error, setError]       = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // fetch courses + classrooms on mount
  useEffect(() => {
    apiClient.get("/exams/list-courses/")
      .then((res) => {
        if (res.data.status === "success") setCourses(res.data.courses)
      })
      .catch(() => setError("Failed to load courses."))

    apiClient.get("/exams/list-classrooms/")
      .then((res) => {
        if (res.data.status === "success") setClassroomOptions(res.data.classrooms)
      })
      .catch(() => setError("Failed to load classrooms."))
  }, [])

  // toggle a classroom in selection
  const toggleClassroom = (room: string) => {
    setClassrooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    )
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(""); setMessage("")

    // basic validation
    if (!selectedCourse || !date || !startTime || !endTime || classrooms.length === 0) {
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
      const payload = {
        course_id:     selectedCourse,
        date,
        start_time:    startTime,
        end_time:      endTime,
        num_proctors:  numProctors,
        student_count: studentCount,
        classrooms,    // <-- array of selected rooms
      }
      const res = await apiClient.post("/exams/create-exam/", payload)
      if (res.data.status === "success") {
        setMessage(res.data.message || "Exam created successfully!")
        // reset form
        setSelectedCourse("") 
        setDate("") 
        setStartTime("") 
        setEndTime("") 
        setNumProctors(1) 
        setClassrooms([]) 
        setClassroomQuery("") 
        setStudentCount(0)
        setTimeout(onClose, 2000)
      } else {
        setError(res.data.message || "Error creating exam")
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating exam.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
        onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4"
          initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-blue-600 border-2">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Create New Exam</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <XIcon className="h-4 w-4 text-red-600" />
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
                {/* Course */}
                <div className="space-y-2">
                  <Label htmlFor="course">Course <span className="text-red-500">*</span></Label>
                  <select
                    id="course"
                    className="w-full border rounded p-2"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min = {new Date().toISOString().split("T")[0]} // Disable past dates when creating an exam.
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time <span className="text-red-500">*</span></Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time <span className="text-red-500">*</span></Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Classrooms (searchable multi-select) */}
                <div className="space-y-2">
                  <Label>Classroom(s) <span className="text-red-500">*</span></Label>
                  <Command className="border rounded">
                    <CommandInput
                      placeholder="Search classrooms..."
                      value={classroomQuery}
                      onValueChange={setClassroomQuery}
                    />
                    <CommandList className="max-h-[8rem] overflow-y-auto">
                      <CommandEmpty>No classrooms found.</CommandEmpty>
                      <CommandGroup>
                        {classroomOptions
                          .filter((r) =>
                            r.toLowerCase().includes(classroomQuery.toLowerCase())
                          )
                          .map((room) => (
                            <CommandItem
                              key={room}
                              onSelect={() => toggleClassroom(room)}
                            >
                              <Check
                                className={`mr-2 ${
                                  classrooms.includes(room) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {room}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {classrooms.map((room) => (
                      <Badge key={room} variant="secondary" className="flex items-center space-x-1">
                        <span>{room}</span>
                        <XIcon
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => toggleClassroom(room)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Proctors & Students */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numProctors">Number of Proctors</Label>
                    <Input
                      id="numProctors"
                      type="number"
                      min={1}
                      value={numProctors}
                      onChange={(e) => setNumProctors(+e.target.value || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentCount">Student Count</Label>
                    <Input
                      id="studentCount"
                      type="number"
                      min={0}
                      value={studentCount}
                      onChange={(e) => setStudentCount(+e.target.value || 0)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
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
