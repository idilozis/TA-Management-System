"use client"

import { useState, useEffect } from "react"
import apiClient from "@/lib/axiosClient"
import { CalendarDays, Pencil, Check } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

const TIME_SLOTS = [
  "08:30-09:20",
  "09:30-10:20",
  "10:30-11:20",
  "11:30-12:20",
  "12:30-13:20",
  "13:30-14:20",
  "14:30-15:20",
  "15:30-16:20",
  "16:30-17:20",
  "17:30-18:20",
]

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"]

interface SlotData {
  id?: number
  day: string
  time_slot: string
  course: string
}

// A helper component to render a table cell
function ScheduleCell({
  day,
  timeSlot,
  course,
  onClick,
  isEditMode,
}: {
  day: string
  timeSlot: string
  course: string
  onClick: () => void
  isEditMode: boolean
}) {
  return (
    <TableCell
      onClick={onClick}
      className={`
        text-center h-12 transition-colors border-r border-gray-300 dark:border-gray-700
        ${course ? "bg-blue-100 dark:bg-blue-950" : ""}
        ${isEditMode ? "cursor-pointer hover:bg-muted" : ""}
      `}
    >
      {course && (
        <Badge
          variant="outline"
          className="bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium text-base px-3 py-1"
        >
          {course}
        </Badge>
      )}
    </TableCell>
  )
}

export default function WeeklyScheduleModal() {
  const [slots, setSlots] = useState<SlotData[]>([])
  const [editSlot, setEditSlot] = useState<SlotData | null>(null)
  const [newCourse, setNewCourse] = useState("")
  const [message, setMessage] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch schedule on mount
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoading(true)
      try {
        const res = await apiClient.get("/schedule/list-weekly/")
        if (res.data.status === "success") {
          setSlots(res.data.slots)
        } else {
          setError("Failed to load schedule data")
        }
      } catch (err) {
        console.error("Error fetching schedule:", err)
        setError("Error connecting to server")
      } finally {
        setIsLoading(false)
      }
    }
    fetchSlots()
  }, [])

  // Get course name and slot id from current state
  const getCourseFor = (day: string, timeSlot: string) =>
    slots.find((s) => s.day === day && s.time_slot === timeSlot)?.course || ""
  const getSlotId = (day: string, timeSlot: string) => slots.find((s) => s.day === day && s.time_slot === timeSlot)?.id

  const handleCellClick = (day: string, timeSlot: string) => {
    if (!isEditMode) return
    const slot = slots.find((s) => s.day === day && s.time_slot === timeSlot)
    setEditSlot({
      id: slot?.id,
      day,
      time_slot: timeSlot,
      course: slot ? slot.course : "",
    })
    setNewCourse(slot ? slot.course : "")
    setMessage("")
  }

  const handleSaveSlot = async () => {
    if (!editSlot) return
    if (!newCourse.trim()) {
      setMessage("Course name cannot be empty.")
      return
    }
    try {
      const res = await apiClient.post("/schedule/update-weekly/", {
        day: editSlot.day,
        time_slot: editSlot.time_slot,
        course: newCourse.trim(),
      })
      if (res.data.status === "success") {
        setMessage("Slot updated successfully.")
        setSlots((prev) => {
          const updated = [...prev]
          const index = updated.findIndex((s) => s.day === editSlot.day && s.time_slot === editSlot.time_slot)
          if (index >= 0) {
            updated[index] = { ...updated[index], course: newCourse.trim(), id: res.data.slot_id }
          } else {
            updated.push({
              id: res.data.slot_id,
              day: editSlot.day,
              time_slot: editSlot.time_slot,
              course: newCourse.trim(),
            })
          }
          return updated
        })
        setEditSlot(null)
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(res.data.message || "Error updating slot.")
      }
    } catch (err) {
      console.error("Error saving slot:", err)
      setMessage("Error updating slot.")
    }
  }

  const handleDeleteSlot = async () => {
    if (!editSlot) return
    const slotId = getSlotId(editSlot.day, editSlot.time_slot)
    if (!slotId) {
      setEditSlot(null)
      return
    }
    try {
      const res = await apiClient.post("/schedule/delete-weekly/", {
        id: slotId,
        day: editSlot.day,
        time_slot: editSlot.time_slot,
      })
      if (res.data.status === "success") {
        setMessage("Slot deleted successfully.")
        setSlots((prev) => prev.filter((s) => !(s.day === editSlot.day && s.time_slot === editSlot.time_slot)))
        setEditSlot(null)
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(res.data.message || "Error deleting slot.")
      }
    } catch (err) {
      console.error("Error deleting slot:", err)
      setMessage("Error deleting slot.")
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center text-2xl font-bold">
            <CalendarDays className="mr-2 h-6 w-6 text-blue-600" /> MY SCHEDULE
          </CardTitle>

          <Button
            onClick={() => {
              setIsEditMode((prev) => !prev)
              setEditSlot(null)
            }}
            variant={isEditMode ? "default" : "outline"}
            className="gap-1"
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" /> Edit Schedule
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading schedule...</div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-center">Time</TableHead>
                  {DAYS.map((day) => (
                    <TableHead key={day} className="font-bold text-center text-blue-600 text-base">
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIME_SLOTS.map((timeSlot) => (
                  <TableRow key={timeSlot}>
                    <TableCell className="font-medium text-center bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {timeSlot}
                    </TableCell>
                    {DAYS.map((day) => (
                      <ScheduleCell
                        key={day}
                        day={day}
                        timeSlot={timeSlot}
                        course={getCourseFor(day, timeSlot)}
                        isEditMode={isEditMode}
                        onClick={() => handleCellClick(day, timeSlot)}
                      />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!editSlot} onOpenChange={(open) => !open && setEditSlot(null)}>
          {editSlot && (
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Edit Slot ({editSlot.day} {editSlot.time_slot})
                </DialogTitle>
              </DialogHeader>

              {message && (
                <Alert variant={message.includes("success") ? "default" : "destructive"} className="my-2">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 py-2">
                <Input
                  placeholder="Enter course name"
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="w-full"
                />
              </div>

              <DialogFooter className="flex justify-between sm:justify-between">
                <div>
                  {editSlot.id && editSlot.course && (
                    <Button variant="destructive" onClick={handleDeleteSlot} className="mr-2">
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditSlot(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSlot}>Save</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </CardContent>
    </Card>
  )
}
