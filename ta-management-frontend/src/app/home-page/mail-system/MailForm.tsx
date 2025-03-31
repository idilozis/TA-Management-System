"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface UserOption {
  email: string
  label: string
}

interface MailFormProps {
  role: "TA" | "Staff"
  onClose: () => void
  preselectedEmail?: string
}

export default function MailForm({ role, onClose, preselectedEmail }: MailFormProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserEmail, setSelectedUserEmail] = useState(preselectedEmail || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Fetch TAs or Staff
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiClient.get(`/list/mail-users/?role=${role}`)
        if (res.data.status === "success") {
          setUsers(res.data.users)
        } else {
          setError(res.data.message || "Error loading users.")
        }
      } catch (err: any) {
        setError("Error fetching users.")
        console.error(err)
      }
    }
    fetchUsers()
  }, [role])

  const filteredUsers = users.filter((u) => u.label.toLowerCase().includes(searchQuery.toLowerCase()))

  async function handleSendMail() {
    if (!selectedUserEmail || !message.trim()) {
      setError("You must choose a recipient and enter a message.")
      return
    }
    try {
      const formData = new FormData()
      formData.append("to_email", selectedUserEmail)
      formData.append("message", message)

      const res = await apiClient.post("/list/mail-sender/", formData)
      if (res.data.status === "success") {
        setSuccessMessage("Mail sent successfully!")
        // auto-close after 1.5s
        setTimeout(() => {
          setSuccessMessage("")
          onClose()
        }, 1500)
      } else {
        setError(res.data.message || "Error sending mail.")
      }
    } catch (err: any) {
      setError("Error sending mail. Please try again.")
      console.error(err)
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Contact {role === "TA" ? "TAs" : "Staff"}</h2>

      {error && <div className="text-red-600">{error}</div>}
      {successMessage && <div className="text-green-600">{successMessage}</div>}

      {/* Search bar */}
      <div>
        <Label className="text-sm font-medium mb-1">Search {role === "TA" ? "TAs" : "Staff"}</Label>
        <Input
          placeholder={`Search among ${role === "TA" ? "TAs" : "Staff"}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Choose recipient */}
      <div>
        <Label className="text-sm font-medium mb-1">Choose Recipient:</Label>
        <select
          className="border border-gray-300 p-2 w-full rounded"
          value={selectedUserEmail}
          onChange={(e) => setSelectedUserEmail(e.target.value)}
        >
          <option value="">-- Select --</option>
          {filteredUsers.map((u) => (
            <option key={u.email} value={u.email}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      {/* Non-editable "To" field */}
      <div>
        <Input readOnly className="bg-blue-50 text-blue-800" value={selectedUserEmail} placeholder="to:" />
      </div>

      {/* Message text area */}
      <div>
        <Label className="text-sm font-medium mb-1">Subject</Label>
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" className="bg-gray-200" onClick={onClose}>
          Cancel
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleSendMail}>
          Send
        </Button>
      </div>
    </div>
  )
}

