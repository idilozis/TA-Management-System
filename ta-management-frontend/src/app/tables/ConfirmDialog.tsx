"use client"

import { ReactNode, useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  title: string
  description: string
  onConfirm: () => Promise<void> | void
  children: ReactNode  // the trigger (e.g. a trash-icon button)
}

export default function ConfirmDialog({
  title,
  description,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async () => {
    setOpen(false)
    await onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
