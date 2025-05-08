"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { X as XIcon } from "lucide-react"

interface CreateTAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: {
    isAuth: boolean
    role: string
  }
}

export default function CreateTAModal({
  open,
  onOpenChange,
  onSuccess,
  user,
}: CreateTAModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [staffOptions, setStaffOptions] = useState<
    { label: string; value: string }[]
  >([])

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    student_id: "",
    email: "",
    program: "MS",
    ta_type: "FT",
    advisor: "",
  })

  // for CmdK search
  const [advisorQuery, setAdvisorQuery] = useState("")

  // fetch all staff
  useEffect(() => {
    apiClient
      .get("/list/staff/")
      .then((res) => {
        if (res.data.status === "success") {
          const opts = res.data.staff.map((s: any) => ({
            label: `${s.name} ${s.surname}`,
            value: `${s.name} ${s.surname}`,
          }))
          setStaffOptions(opts)
        }
      })
      .catch((err) => console.error(err))
  }, [])

  const filteredStaff = staffOptions.filter((opt) =>
    opt.label.toLowerCase().includes(advisorQuery.toLowerCase())
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
      const res = await apiClient.post("/list/create-ta/", formData)
      if (res.data.status === "success") {
        onSuccess()
        onOpenChange(false)
      } else {
        setError(res.data.message || "Failed to create TA")
      }
    } catch (err: any) {
      if (err.response) {
        const msg = err.response.data?.message
        switch (err.response.status) {
          case 400:
            setError(`Validation error: ${msg || "Check your input"}`)
            break
          case 401:
            setError("Not authenticated. Please log in again.")
            break
          case 409:
            setError(`Duplicate entry: ${msg || "This TA already exists"}`)
            break
          default:
            setError(`Server error (${err.response.status}): ${msg}`)
        }
      } else if (err.request) {
        setError("No response from server. Please check your connection.")
      } else {
        setError(`Request error: ${err.message}`)
      }
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
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name / Surname */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                First Name <span className="text-red-600">*</span>
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
            <div className="space-y-2">
              <Label htmlFor="surname">
                Last Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="surname"
                required
                value={formData.surname}
                onChange={(e) =>
                  setFormData({ ...formData, surname: e.target.value })
                }
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
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          {/* Student ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student_id">
                Student ID <span className="text-red-600">*</span>
              </Label>
              <Input
                id="student_id"
                required
                value={formData.student_id}
                onChange={(e) =>
                  setFormData({ ...formData, student_id: e.target.value })
                }
              />
            </div>
          </div>

          {/* Program / TA Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="program">
                Program <span className="text-red-600">*</span>
              </Label>
              <select
                id="program"
                className="w-full border rounded px-2 py-1"
                value={formData.program}
                onChange={(e) =>
                  setFormData({ ...formData, program: e.target.value })
                }
              >
                <option value="MS">MS</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ta_type">
                TA Type <span className="text-red-600">*</span>
              </Label>
              <select
                id="ta_type"
                className="w-full border rounded px-2 py-1"
                value={formData.ta_type}
                onChange={(e) =>
                  setFormData({ ...formData, ta_type: e.target.value })
                }
              >
                <option value="FT">Full Time</option>
                <option value="PT">Part Time</option>
              </select>
            </div>
          </div>

          {/* Advisor (CmdK search) */}
          <div className="space-y-2">
            <Label>
              Advisor <span className="text-red-600">*</span>
            </Label>
            <Command className="border rounded">
              <CommandInput
                placeholder={formData.advisor ? "" : "Search advisor…"}
                value={advisorQuery}
                onValueChange={(val) => setAdvisorQuery(val)}
              />
              <CommandList className="max-h-[8rem] overflow-y-auto">
                <CommandEmpty>No advisors found.</CommandEmpty>
                <CommandGroup>
                  {filteredStaff.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      onSelect={() => {
                        setFormData({ ...formData, advisor: opt.value })
                        setAdvisorQuery("")
                      }}
                    >
                      {opt.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
            {formData.advisor && (
              <Badge
                variant="secondary"
                className="inline-flex items-center mt-2 space-x-1"
              >
                <span>{formData.advisor}</span>
                <XIcon
                  className="w-4 h-4 cursor-pointer"
                  onClick={() => setFormData({ ...formData, advisor: "" })}
                />
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setError("")
                onOpenChange(false)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {loading ? "Creating..." : "Create TA"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
