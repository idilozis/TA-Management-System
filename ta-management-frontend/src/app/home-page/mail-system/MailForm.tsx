"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from "@/components/ui/command"
import { Check } from "lucide-react"

interface UserOption {
  email: string
  label: string
}

interface MailFormProps {
  role: "TA" | "Staff"
  onClose: () => void
  preselectedEmail?: string
  hideSearchAndChoose?: boolean
}

export default function MailForm({
  role,
  onClose,
  preselectedEmail,
  hideSearchAndChoose = false,
}: MailFormProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUserEmail, setSelectedUserEmail] = useState(preselectedEmail || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Fetch TAs or Staff if we want the user list
  useEffect(() => {
    if (!hideSearchAndChoose) {
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
    }
  }, [role, hideSearchAndChoose])

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
    <div className="space-y-4">
      {error && <div className="text-red-600">{error}</div>}
      {successMessage && <div className="text-green-600">{successMessage}</div>}

      {/* Conditionally render search and choose fields */}
      {!hideSearchAndChoose && (
        <div className="space-y-2">
          <Label htmlFor="search">Search {role === "TA" ? "TAs" : "Instructor"}</Label>
          <Command className="border rounded">
            <CommandInput
              placeholder="Search..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[7rem] overflow-y-auto">
              <CommandEmpty>No {role === "TA" ? "TAs" : "instructors"} found.</CommandEmpty>
              <CommandGroup>
                {users
                  .filter((u) =>
                    u.label.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((user) => (
                    <CommandItem
                      key={user.email}
                      onSelect={() => setSelectedUserEmail(user.email)}
                    >
                      <Check
                        className={`mr-2 ${
                          selectedUserEmail === user.email ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {user.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}

      {/* "To:" field (always shown, read-only) */}
      <div>
        <Input
          readOnly
          className="bg-blue-50 text-blue-800"
          value={selectedUserEmail}
          placeholder="to:"
        />
      </div>

      {/* Subject (message) text area */}
      <div>
        <Label className="text-sm font-medium mb-1">Subject</Label>
        <Textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
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