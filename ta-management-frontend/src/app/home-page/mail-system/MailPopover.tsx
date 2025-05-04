"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import MailForm from "@/app/home-page/mail-system/MailForm"

type MailStage = "menu" | "mail"

interface MailPopoverProps {
  forceOpen?: boolean
  initialRole?: "TA" | "Staff" | null
  initialEmail?: string | null
  onClose?: () => void
  hideButton?: boolean
  hideSearchAndChoose?: boolean
}

export default function MailPopover({
  forceOpen = false,
  initialRole = null,
  initialEmail = null,
  onClose,
  hideButton = false,
  hideSearchAndChoose = false,
}: MailPopoverProps) {
  const [open, setOpen] = useState(forceOpen)
  const [stage, setStage] = useState<MailStage>(initialRole ? "mail" : "menu")
  const [role, setRole] = useState<"TA" | "Staff" | null>(initialRole)

  // Open logic if forced by props
  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      if (initialRole) {
        setRole(initialRole)
        setStage("mail")
      }
    }
  }, [forceOpen, initialRole])

  // Close logic
  const handleClose = () => {
    setOpen(false)
    if (!forceOpen) {
      setStage("menu")
      setRole(null)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {!hideButton && (
        <Button
          onClick={() => setOpen(true)}
          className="flex items-center space-x-1 bg-emerald-600 text-white px-4 py-3 rounded hover:bg-emerald-500"
        >
          <Mail className="h-5 w-5" />
          <span>Contact with Users</span>
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {stage === "menu" && (
              <div className="flex flex-col space-y-2">
                <h2 className="font-semibold mb-2 text-blue-800 text-left">** Please choose user type before sending mail.</h2>
                <button
                  onClick={() => {
                    setRole("TA")
                    setStage("mail")
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-emerald-100 transition-colors bg-gray-100"
                >
                  Contact with TAs
                </button>
                <button
                  onClick={() => {
                    setRole("Staff")
                    setStage("mail")
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-emerald-100 transition-colors bg-gray-100"
                >
                  Contact with Instructors
                </button>
                <div className="flex justify-end">
                  <Button variant="secondary" className="bg-blue-600 text-white hover:bg-blue-500" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {stage === "mail" && role && (
              <MailForm
                role={role}
                preselectedEmail={initialEmail || undefined}
                onClose={handleClose}
                hideSearchAndChoose={hideSearchAndChoose}
              />
            )}
          </div>
        </div>
      )}
    </>
  )

}
