"use client"
import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExpandableCellProps {
  content: string
  maxLength?: number
  className?: string
}

export function ExpandableCell({ content, maxLength = 100, className }: ExpandableCellProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = content.length > maxLength

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn("whitespace-pre-wrap break-words w-full", !isExpanded && shouldTruncate ? "line-clamp-2" : "")}
      >
        {content}
      </div>

      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-xs flex items-center mt-1 focus:outline-none"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  )
}
