"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import apiClient from "@/lib/axiosClient"

// CmdK imports
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

interface CreateStaffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: { isAuth: boolean; role: string }
}

interface CourseOption {
  code: string
  name: string
  label: string
}

export default function CreateStaffModal({
  open,
  onOpenChange,
  onSuccess,
  user,
}: CreateStaffModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    department: "",
    courses: [] as string[],
  })

  // Courses for multi-select
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([])
  const [courseQuery, setCourseQuery] = useState("")

  // Load course list when modal opens
  useEffect(() => {
    if (!open) return
    apiClient.get("/list/courses/")
      .then(res => {
        if (res.data.status === "success") {
          setCourseOptions(
            res.data.courses.map((c: any) => ({
              code: c.code,
              name: c.name,
              label: `${c.code} — ${c.name}`,
            }))
          )
        }
      })
      .catch(console.error)
  }, [open])

  const filteredCourses = courseOptions.filter(opt =>
    opt.label.toLowerCase().includes(courseQuery.toLowerCase())
  )

  function toggleCourse(code: string) {
    setFormData(prev => {
      const has = prev.courses.includes(code)
      return {
        ...prev,
        courses: has
          ? prev.courses.filter(c => c !== code)
          : [...prev.courses, code],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!user.isAuth || user.role !== "ADMIN") {
      setError("You are not authorized")
      return
    }

    setLoading(true)
    try {
      // build payload
      const payload: any = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        department: formData.department,
      }
      if (formData.courses.length) {
        payload.courses = formData.courses
      }

      const res = await apiClient.post("/list/create-staff/", payload)
      if (res.data.status === "success") {
        onSuccess()
        onOpenChange(false)
      } else {
        setError(res.data.message)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Instructor</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                First Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surname">
                Last Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="surname"
                required
                value={formData.surname}
                onChange={e => setFormData({ ...formData, surname: e.target.value })}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-600">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="department">
              Department <span className="text-red-600">*</span>
            </Label>
            <Select
              value={formData.department}
              onValueChange={val => setFormData({ ...formData, department: val })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CS">CS</SelectItem>
                <SelectItem value="EEE">EEE</SelectItem>
                <SelectItem value="IE">IE</SelectItem>
                <SelectItem value="ME">ME</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Courses Taught */}
          <div className="space-y-2">
            <Label>Courses Taught (Optional)<small className="text-muted">(optional)</small></Label>
            <Command className="border rounded">
              <CommandInput
                placeholder="Search courses..."
                value={courseQuery}
                onValueChange={setCourseQuery}
              />
              <CommandList className="max-h-[8rem] overflow-y-auto">
                <CommandEmpty>No courses</CommandEmpty>
                <CommandGroup>
                  {filteredCourses.map(opt => (
                    <CommandItem
                      key={opt.code}
                      onSelect={() => toggleCourse(opt.code)}
                    >
                      <Check
                        className={`mr-2 ${
                          formData.courses.includes(opt.code)
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                      />
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            {formData.courses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.courses.map(code => {
                  const opt = courseOptions.find(o => o.code === code)
                  return (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="flex items-center space-x-1"
                    >
                      <span>{opt?.label ?? code}</span>
                      <XIcon
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleCourse(code)}
                      />
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? "Creating..." : "Create Instructor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
