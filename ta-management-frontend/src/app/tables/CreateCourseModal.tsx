"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import apiClient from "@/lib/axiosClient"

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Check, X as XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: { isAuth: boolean; role: string }
}

interface Instructor {
  email: string
  label: string
}

export default function CreateCourseModal({
  open,
  onOpenChange,
  onSuccess,
  user,
}: CreateCourseModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    instructor_emails: [] as string[],
  })
  const [instructorQuery, setInstructorQuery] = useState("")

  // Fetch real staff list when modal opens
  useEffect(() => {
    if (!open) return

    apiClient
      .get("/list/mail-users/", { params: { role: "Staff" } })
      .then((res) => {
        if (res.data.status === "success") {
          setInstructors(res.data.users)
        } else {
          console.warn("Could not load instructors:", res.data.message)
        }
      })
      .catch((err) => {
        console.error("Failed to fetch instructors:", err)
      })
  }, [open])

  function toggleInstructor(email: string) {
    setFormData((prev) => {
      const exists = prev.instructor_emails.includes(email)
      return {
        ...prev,
        instructor_emails: exists
          ? prev.instructor_emails.filter((e) => e !== email)
          : [...prev.instructor_emails, email],
      }
    })
  }

  const filteredInstructors = instructors.filter((ins) =>
    ins.label.toLowerCase().includes(instructorQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user.isAuth || user.role !== "ADMIN") {
      setError("You are not authorized to perform this action")
      return
    }

    setLoading(true)
    try {
      const res = await apiClient.post("/list/create-course/", formData)
      if (res.data.status === "success") {
        onSuccess()
        onOpenChange(false)
      } else {
        setError(res.data.message || "Failed to create course")
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Code */}
          <div className="space-y-2">
            <Label htmlFor="code">
              Course Code <span className="text-red-600">*</span>
            </Label>
            <Input
              id="code"
              required
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
            />
          </div>

          {/* Course Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Course Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Instructors multi-select (cmdk style) */}
          <div className="space-y-2">
            <Label>
              Instructors <span className="text-red-600">*</span>
            </Label>

            <Command className="border rounded">
              <CommandInput
                placeholder="Search instructors..."
                value={instructorQuery}
                onValueChange={setInstructorQuery}
              />

              <CommandList className="max-h-[8rem] overflow-y-auto">
                <CommandEmpty>No instructors found.</CommandEmpty>

                <CommandGroup>
                  {filteredInstructors.map((ins) => (
                    <CommandItem
                      key={ins.email}
                      onSelect={() => toggleInstructor(ins.email)}
                    >
                      <Check
                        className={`mr-2 ${
                          formData.instructor_emails.includes(ins.email)
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                      {ins.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {/* Selected badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.instructor_emails.map((email) => {
                const ins = instructors.find((i) => i.email === email)
                return (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{ins?.label ?? email}</span>
                    <XIcon
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => toggleInstructor(email)}
                    />
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setError("")
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? "Creating..." : "Create Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
