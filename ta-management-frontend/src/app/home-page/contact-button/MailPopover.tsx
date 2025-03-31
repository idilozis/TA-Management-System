"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import MailForm from "@/app/home-page/contact-button/MailForm";

type MailStage = "menu" | "mail";

export default function MailPopover() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<MailStage>("menu");
  const [role, setRole] = useState<"TA" | "Staff" | null>(null);

  // Reset state when the popover is closed
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStage("menu");
      setRole(null);
    }
  };

  // Determine width based on stage
  const widthClass = stage === "menu" ? "w-40" : "w-100";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button className="flex items-center space-x-1 bg-emerald-600 text-white px-4 py-3 rounded hover:bg-emerald-500">
          <Mail className="h-5 w-5" />
          <span>Send Mail</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className={`${widthClass} p-4`}>
        {stage === "menu" && (
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => {
                setRole("TA");
                setStage("mail");
              }}
              className="w-full text-left px-2 py-1 rounded hover:bg-emerald-100"
            >
              Contact TAs
            </button>
            <button
              onClick={() => {
                setRole("Staff");
                setStage("mail");
              }}
              className="w-full text-left px-2 py-1 rounded hover:bg-emerald-100"
            >
              Contact Staff
            </button>
          </div>
        )}

        {stage === "mail" && role && (
          <MailForm
            role={role}
            onClose={() => setOpen(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
