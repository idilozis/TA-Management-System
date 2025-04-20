"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import apiClient from "@/lib/axiosClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Check, X as XIcon } from "lucide-react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface DeanExamModalProps {
  onClose: () => void
}

export default function DeanExamModal({ onClose }: DeanExamModalProps) {
  // server data
  const [courseOptions, setCourseOptions] = useState<string[]>([])
  const [classroomOptions, setClassroomOptions] = useState<string[]>([])

  // form state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [courseQuery, setCourseQuery] = useState<string>("")
  const [classrooms, setClassrooms] = useState<string[]>([])
  const [classroomQuery, setClassroomQuery] = useState<string>("")
  const [date, setDate] = useState<string>("")
  const [startTime, setStartTime] = useState<string>("")
  const [endTime, setEndTime] = useState<string>("")
  const [numProctors, setNumProctors] = useState<number>(1)
  const [studentCount, setStudentCount] = useState<number>(0)

  // UI state
  const [message, setMessage] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    apiClient
      .get("/exams/list-dean-courses/")
      .then((res) => {
        if (res.data.status === "success") {
          setCourseOptions(res.data.courses)
        }
      })
      .catch(() => setError("Failed to load courses."))

    apiClient
      .get("/exams/list-classrooms/")
      .then((res) => {
        if (res.data.status === "success") {
          setClassroomOptions(res.data.classrooms)
        }
      })
      .catch(() => setError("Failed to load classrooms."))
  }, [])

  const toggleCourse = (code: string) => {
    setSelectedCourses((prev) =>
      prev.includes(code) ? [] : [code]
    )
  }
  const toggleClassroom = (room: string) => {
    setClassrooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setMessage("")

    if (
      !date ||
      !startTime ||
      !endTime ||
      selectedCourses.length === 0 ||
      classrooms.length === 0
    ) {
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
        course_codes: selectedCourses,
        date,
        start_time: startTime,
        end_time: endTime,
        num_proctors: numProctors,
        student_count: studentCount,
        classrooms,
      }
      const res = await apiClient.post("/exams/create-dean-exam/", payload)
      if (res.data.status === "success") {
        setMessage("Exam created successfully!")
        // reset form
        setSelectedCourses([])
        setCourseQuery("")
        setClassrooms([])
        setClassroomQuery("")
        setDate("")
        setStartTime("")
        setEndTime("")
        setNumProctors(1)
        setStudentCount(0)
        setTimeout(onClose, 1500)
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-4"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-green-600 border-2">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Schedule Non‑Dept Exam</CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
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

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Courses */}
                <div className="space-y-2">
                  <Label>
                    Courses <span className="text-red-500">*</span>
                  </Label>
                  <Command className="border rounded">
                    <CommandInput
                      placeholder="Search courses..."
                      value={courseQuery}
                      onValueChange={setCourseQuery}
                    />
                    <CommandList className="max-h-[6rem] overflow-y-auto">
                      <CommandEmpty>No courses found.</CommandEmpty>
                      <CommandGroup>
                        {courseOptions
                          .filter((c) =>
                            c.toLowerCase().includes(courseQuery.toLowerCase())
                          )
                          .map((code) => (
                            <CommandItem key={code} onSelect={() => toggleCourse(code)}>
                              <Check
                                className={`mr-2 ${
                                  selectedCourses.includes(code)
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {code}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCourses.map((c) => (
                      <Badge
                        key={c}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{c}</span>
                        <XIcon
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => toggleCourse(c)}
                        />
                      </Badge>
                    ))}
                  </div>

                {/* Classrooms */}
                </div>
                <div className="space-y-2">
                  <Label>
                    Classrooms <span className="text-red-500">*</span>
                  </Label>
                  <Command className="border rounded">
                    <CommandInput
                      placeholder="Search rooms..."
                      value={classroomQuery}
                      onValueChange={setClassroomQuery}
                    />
                    <CommandList className="max-h-[6rem] overflow-y-auto">
                      <CommandEmpty>No rooms found.</CommandEmpty>
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
                                  classrooms.includes(room)
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {room}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {classrooms.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{r}</span>
                        <XIcon
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => toggleClassroom(r)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <Label>
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Start Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      End Time <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Proctors & Students */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Proctors</Label>
                    <Input
                      type="number"
                      min={1}
                      value={numProctors}
                      onChange={(e) =>
                        setNumProctors(+e.target.value || 1)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Student Count</Label>
                    <Input
                      type="number"
                      min={0}
                      value={studentCount}
                      onChange={(e) =>
                        setStudentCount(+e.target.value || 0)
                      }
                    />
                  </div>
                </div>

                <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-500"
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
