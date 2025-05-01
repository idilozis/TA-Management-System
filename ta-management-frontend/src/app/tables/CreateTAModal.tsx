import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import apiClient from "@/lib/axiosClient"

interface CreateTAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: any
}

export default function CreateTAModal({ open, onOpenChange, onSuccess, user }: CreateTAModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    student_id: "",
    tc_no: "",
    email: "",
    program: "MS",
    iban: "",
    phone: "",
    advisor: "",
    ta_type: "FT"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check authorization
    if (!user?.isAuth || user?.role !== "ADMIN") {
      setError("You are not authorized to perform this action")
      return
    }
    
    setLoading(true)
    setError("")

    try {
      const res = await apiClient.post("/list/create/ta/", formData)
      if (res.data.status === "success") {
        onSuccess()
      } else {
        setError(res.data.message || "Failed to create TA")
      }
    } catch (err: any) {
      // Detailed error handling
      if (err.response) {
        // Server responded with error
        const serverError = err.response.data?.message
        if (err.response.status === 400) {
          setError(`Validation error: ${serverError || 'Please check your input'}`)
        } else if (err.response.status === 401) {
          setError('Not authenticated. Please log in again.')
        } else if (err.response.status === 409) {
          setError(`Duplicate entry: ${serverError || 'This TA already exists'}`)
        } else {
          setError(`Server error (${err.response.status}): ${serverError || 'Unknown error'}`)
        }
      } else if (err.request) {
        // Request made but no response
        setError('No response from server. Please check your connection.')
      } else {
        // Request setup failed
        setError(`Request failed: ${err.message}`)
      }
      console.error('Detailed error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Teaching Assistant</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">First Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="surname">Last Name *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student ID *</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tc_no">TC No *</Label>
              <Input
                id="tc_no"
                value={formData.tc_no}
                onChange={(e) => setFormData({ ...formData, tc_no: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program">Program *</Label>
              <Select
                value={formData.program}
                onValueChange={(value) => setFormData({ ...formData, program: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MS">MS</SelectItem>
                  <SelectItem value="PhD">PhD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ta_type">TA Type *</Label>
              <Select
                value={formData.ta_type}
                onValueChange={(value) => setFormData({ ...formData, ta_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FT">Full Time</SelectItem>
                  <SelectItem value="PT">Part Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advisor">Advisor</Label>
            <Input
              id="advisor"
              value={formData.advisor}
              onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create TA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 