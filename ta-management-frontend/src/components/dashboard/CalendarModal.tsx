"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import apiClient from "@/lib/axiosClient";
import { motion } from "framer-motion";

interface EventType {
  title: string;
  start: string;
  end: string;
  extendedProps: {
    type: "proctoring" | "duty" | "leave";
    duration?: number;
  };
}

export default function CalendarModal() {
  const [events, setEvents] = useState<EventType[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  // 1. Load events
  useEffect(() => {
    apiClient.get("/calendar/events/").then((res) => {
      if (res.data.status === "success") {
        setEvents(res.data.events);
      }
    });
  }, []);

  // 2. Compute all occupied dates (YYYY-MM-DD) for shading
  const occupiedDates = useMemo(() => {
    const dates = new Set<string>();
    events.forEach((evt) => {
      const sd = new Date(evt.start);
      const ed = new Date(evt.end);
      const cur = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate());
      const last = new Date(ed.getFullYear(), ed.getMonth(), ed.getDate());
      while (cur <= last) {
        const key = 
          `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
        dates.add(key);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return dates;
  }, [events]);

  // 3. Map to FullCalendar events
  const mappedEvents = events.map((evt) => {
    const type = evt.extendedProps.type;
    const bgColor =
      type === "duty" ? "#22c55e" :
      type === "leave" ? "#3b82f6" :
                         "#ef4444";

    let titleText = evt.title;
    if (type === "proctoring") {
      const code = evt.title.split(":")[1]?.trim().split(" ")[0] || "";
      titleText = `Proctoring: ${code}`;
    } else if (type === "duty") {
      titleText = `✅ ${evt.title}`;
    }

    return {
      title: titleText,
      start: evt.start,
      end:   evt.end,
      backgroundColor: bgColor,
      borderColor:     bgColor,
      textColor:       "#000000",
    };
  });

  // 4. ±4-month range
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 4, 1);
  const rangeEnd   = new Date(now.getFullYear(), now.getMonth() + 5, 0);

  // 5. Render title + en-US AM/PM times
  const renderEventContent = (info: any) => {
    const s = info.event.start;
    const e = info.event.end;
    const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    const sStr = s instanceof Date ? s.toLocaleTimeString("en-US", opts) : "";
    const eStr = e instanceof Date ? e.toLocaleTimeString("en-US", opts) : "";
    const label = sStr && eStr ? `${sStr} - ${eStr}` : sStr;
    return (
      <div>
        <div className="text-sm font-medium text-black">{info.event.title}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View My Calendar</Button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-5xl rounded-2xl shadow-2xl bg-white">
        <DialogTitle>My Events Calendar</DialogTitle>

        {/* Legend */}
        <div className="flex gap-6 mb-4 text-sm">
          {[
            ["Duty", "#22c55e"],
            ["Leave", "#3b82f6"],
            ["Proctoring", "#ef4444"],
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-black">{label}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            firstDay={1}                      // start week on Monday
            headerToolbar={{ left: "prev,next", center: "title", right: "" }}
            validRange={{ start: rangeStart, end: rangeEnd }}
            events={mappedEvents}
            height={600}
            displayEventTime={false}
            eventContent={renderEventContent}
            dayCellClassNames={(arg) => {
              const d = arg.date;
              const key =
                `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              return occupiedDates.has(key) ? ["bg-gray-100"] : [];
            }}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
