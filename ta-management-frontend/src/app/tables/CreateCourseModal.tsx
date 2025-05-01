import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { MultiSelect } from "@/components/ui/multi-select"
import apiClient from "@/lib/axiosClient"

interface CreateCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Instructor {
  email: string
  label: string
}

export default function CreateCourseModal({ open, onOpenChange, onSuccess }: CreateCourseModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    instructor_emails: [] as string[]
  })

  // Fetch instructors for the dropdown
  useEffect(() => {
    async function fetchInstructors() {
      try {
        const res = await apiClient.get("/mail-users/?role=Staff")
        if (res.data.status === "success") {
          setInstructors(res.data.users)
        }
      } catch (err) {
        console.error("Failed to fetch instructors:", err)
      }
    }

    if (open) {
      fetchInstructors()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await apiClient.post("list/create/course/", formData)
      if (res.data.status === "success") {
        onSuccess()
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
          <div className="space-y-2">
            <Label htmlFor="code">Course Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructors">Instructors</Label>
            <MultiSelect
              options={instructors}
              value={formData.instructor_emails}
              onChange={(values) => setFormData({ ...formData, instructor_emails: values })}
              labelKey="label"
              valueKey="email"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Course"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 