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
}

export default function MailPopover({
  forceOpen = false,
  initialRole = null,
  initialEmail = null,
  onClose,
  hideButton = false,
}: MailPopoverProps) {
  const [open, setOpen] = useState(forceOpen)
  const [stage, setStage] = useState<MailStage>(initialRole ? "mail" : "menu")
  const [role, setRole] = useState<"TA" | "Staff" | null>(initialRole)

  // Update state when props change
  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      if (initialRole) {
        setRole(initialRole)
        setStage("mail")
      }
    }
  }, [forceOpen, initialRole])

  // Handle close
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
      {/* Trigger button - only shown if not explicitly hidden */}
      {!hideButton && (
        <Button
          onClick={() => setOpen(true)}
          className="flex items-center space-x-1 bg-emerald-600 text-white px-4 py-3 rounded hover:bg-emerald-500"
        >
          <Mail className="h-5 w-5" />
          <span>Send Mail</span>
        </Button>
      )}

      {/* Custom modal implementation */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            // Prevent closing when clicking the backdrop
            e.stopPropagation()
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {stage === "menu" && (
              <div className="flex flex-col space-y-2">
                <h2 className="text-lg font-semibold mb-2">Send Mail</h2>
                <button
                  onClick={() => {
                    setRole("TA")
                    setStage("mail")
                  }}
                  className="w-full text-left px-4 py-2 rounded hover:bg-emerald-100 transition-colors"
                >
                  Contact TAs
                </button>
                <button
                  onClick={() => {
                    setRole("Staff")
                    setStage("mail")
                  }}
                  className="w-full text-left px-4 py-2 rounded hover:bg-emerald-100 transition-colors"
                >
                  Contact Staff
                </button>
                <div className="flex justify-end mt-4">
                  <Button variant="secondary" className="bg-gray-200" onClick={handleClose}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {stage === "mail" && role && (
              <MailForm role={role} preselectedEmail={initialEmail || undefined} onClose={handleClose} />
            )}
          </div>
        </div>
      )}
    </>
  )
}

