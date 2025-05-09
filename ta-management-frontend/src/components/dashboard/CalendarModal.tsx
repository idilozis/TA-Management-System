"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import apiClient from "@/lib/axiosClient"
import { motion } from "framer-motion"

interface EventType {
  title: string
  start: string
  end: string
  extendedProps: {
    type: "proctoring" | "duty" | "leave"
    duration?: number
  }
}

export default function CalendarModal() {
  const [events, setEvents] = useState<EventType[]>([])
  const calendarRef = useRef<FullCalendar>(null)

  // 1. Load events
  useEffect(() => {
    apiClient.get("/calendar/events/").then((res) => {
      if (res.data.status === "success") {
        setEvents(res.data.events)
      }
    })
  }, [])

  // 2. Compute all occupied dates (YYYY-MM-DD) for shading
  const occupiedDates = useMemo(() => {
    const dates = new Set<string>()
    events.forEach((evt) => {
      const sd = new Date(evt.start)
      const ed = new Date(evt.end)
      const cur = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate())
      const last = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate())
      while (cur <= last) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`
        dates.add(key)
        cur.setDate(cur.getDate() + 1)
      }
    })
    return dates
  }, [events])

  // 3. Map to FullCalendar events with explicit color properties
  const mappedEvents = events.map((evt) => {
    const type = evt.extendedProps.type

    let titleText = evt.title
    if (type === "proctoring") {
      const code = evt.title.split(":")[1]?.trim().split(" ")[0] || ""
      titleText = `Proctoring: ${code}`
    } else if (type === "duty") {
      titleText = `✅ ${evt.title}`
    }

    // Create a base event object
    const eventObj: any = {
      id: Math.random().toString(36).substring(2, 9), // Generate a random ID
      title: titleText,
      start: evt.start,
      end: evt.end,
      allDay: false,
      extendedProps: {
        type,
        originalTitle: evt.title,
      },
    }

    // Apply colors based on type
    if (type === "duty") {
      eventObj.backgroundColor = "#22c55e" // Green
      eventObj.borderColor = "#22c55e"
      eventObj.textColor = "#000000"
      eventObj.classNames = ["duty-event"]
    } else if (type === "leave") {
      eventObj.backgroundColor = "#3b82f6" // Blue
      eventObj.borderColor = "#3b82f6"
      eventObj.textColor = "#ffffff"
      eventObj.classNames = ["leave-event"]
    } else if (type === "proctoring") {
      eventObj.backgroundColor = "#ef4444" // Red
      eventObj.borderColor = "#ef4444"
      eventObj.textColor = "#ffffff"
      eventObj.classNames = ["proctoring-event"]
    }

    return eventObj
  })

  // 4. ±4-month range
  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 4, 1)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 5, 0)

  // 5. Custom event rendering
  const renderEventContent = (eventInfo: any) => {
    const s = eventInfo.event.start
    const e = eventInfo.event.end
    const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true }
    const sStr = s instanceof Date ? s.toLocaleTimeString("en-US", opts) : ""
    const eStr = e instanceof Date ? e.toLocaleTimeString("en-US", opts) : ""
    const label = sStr && eStr ? `${sStr} - ${eStr}` : sStr

    const type = eventInfo.event.extendedProps?.type
    const textColorClass = type === "duty" ? "text-black" : "text-white"

    return (
      <div className={`p-1 ${textColorClass}`}>
        <div className="text-sm font-medium">{eventInfo.event.title}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View My Calendar</Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-5xl rounded-2xl shadow-2xl bg-white">
        <DialogTitle>My Events Calendar</DialogTitle>

        <div className="flex gap-6 mb-4 text-sm">
          {[
            ["Duty", "#22c55e"],
            ["Leave", "#3b82f6"],
            ["Proctoring", "#ef4444"],
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-black">{label}</span>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="calendar-container"
        >
          <style jsx global>{`
            /* Force event colors based on class names */
            .fc .duty-event {
              background-color: #22c55e !important;
              border-color: #22c55e !important;
            }
            .fc .leave-event {
              background-color: #3b82f6 !important;
              border-color: #3b82f6 !important;
            }
            .fc .proctoring-event {
              background-color: #ef4444 !important;
              border-color: #ef4444 !important;
            }
            
            /* General event styling */
            .fc-event {
              margin: 1px 0;
              padding: 0;
              border-radius: 3px;
            }
            .fc-daygrid-event-dot {
              display: none !important;
            }
            .fc-event-time {
              display: none;
            }
            .fc-event-title {
              padding: 0 2px;
            }
            
            /* Fix for event rendering */
            .fc-daygrid-event {
              white-space: normal;
            }
          `}</style>

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1} // start week on Monday
            headerToolbar={{ left: "prev,next", center: "title", right: "" }}
            validRange={{ start: rangeStart, end: rangeEnd }}
            events={mappedEvents}
            height={600}
            eventContent={renderEventContent}
            displayEventTime={false}
            eventDisplay="block" // Force block display instead of dots
            dayCellClassNames={(arg) => {
              const d = arg.date
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
              return occupiedDates.has(key) ? ["bg-gray-100"] : []
            }}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
