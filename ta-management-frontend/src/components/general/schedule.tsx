"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/axiosClient";
import { motion, AnimatePresence } from "framer-motion";

const TIME_SLOTS = [
  "08:30-09:20",
  "09:30-10:20",
  "10:30-11:20",
  "11:30-12:20",
  "12:30-13:20",
  "13:30-14:20",
  "14:30-15:20",
  "15:30-16:20",
  "16:30-17:20",
  "17:30-18:20",
];

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];

interface SlotData {
  id?: number;
  day: string;
  time_slot: string;
  course: string;
}

// A helper component to render a table cell
function ScheduleCell({
  day,
  timeSlot,
  course,
  onClick,
  isEditMode,
}: {
  day: string;
  timeSlot: string;
  course: string;
  onClick: () => void;
  isEditMode: boolean;
}) {
  const baseClass = "border border-gray-700 p-2 text-center transition-colors";
  const emptyClass = isEditMode
    ? "bg-neutral-900 cursor-pointer hover:bg-neutral-800 text-gray-200"
    : "bg-neutral-900 text-gray-300";
  const filledClass = isEditMode
    ? "bg-blue-800 text-white cursor-pointer hover:bg-blue-700"
    : "bg-green-800 text-white";

  const cellClass = course ? filledClass : emptyClass;

  return (
    <td className={`${baseClass} ${cellClass}`} onClick={onClick}>
      {course}
    </td>
  );
}

export default function TAWeeklySchedule() {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [editSlot, setEditSlot] = useState<SlotData | null>(null);
  const [newCourse, setNewCourse] = useState("");
  const [message, setMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch schedule on mount
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await apiClient.get("/schedule/list-weekly/");
        if (res.data.status === "success") {
          setSlots(res.data.slots);
        }
      } catch (err) {
        console.error("Error fetching schedule:", err);
      }
    };
    fetchSlots();
  }, []);

  // Get course name and slot id from current state
  const getCourseFor = (day: string, timeSlot: string) =>
    slots.find((s) => s.day === day && s.time_slot === timeSlot)?.course || "";
  const getSlotId = (day: string, timeSlot: string) =>
    slots.find((s) => s.day === day && s.time_slot === timeSlot)?.id;

  const handleCellClick = (day: string, timeSlot: string) => {
    if (!isEditMode) return;
    const slot = slots.find((s) => s.day === day && s.time_slot === timeSlot);
    setEditSlot({
      id: slot?.id,
      day,
      time_slot: timeSlot,
      course: slot ? slot.course : "",
    });
    setNewCourse(slot ? slot.course : "");
    setMessage("");
  };

  const handleSaveSlot = async () => {
    if (!editSlot) return;
    if (!newCourse.trim()) {
      setMessage("Course name cannot be empty.");
      return;
    }
    try {
      const res = await apiClient.post("/schedule/update-weekly/", {
        day: editSlot.day,
        time_slot: editSlot.time_slot,
        course: newCourse.trim(),
      });
      if (res.data.status === "success") {
        setMessage("Slot updated successfully.");
        // Use functional update to avoid stale closure issues
        setSlots((prev) => {
          const updated = [...prev];
          const index = updated.findIndex(
            (s) => s.day === editSlot.day && s.time_slot === editSlot.time_slot
          );
          if (index >= 0) {
            updated[index] = { ...updated[index], course: newCourse.trim(), id: res.data.slot_id };
          } else {
            updated.push({
              id: res.data.slot_id,
              day: editSlot.day,
              time_slot: editSlot.time_slot,
              course: newCourse.trim(),
            });
          }
          return updated;
        });
        setEditSlot(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(res.data.message || "Error updating slot.");
      }
    } catch (err) {
      console.error("Error saving slot:", err);
      setMessage("Error updating slot.");
    }
  };

  const handleDeleteSlot = async () => {
    if (!editSlot) return;
    const slotId = getSlotId(editSlot.day, editSlot.time_slot);
    if (!slotId) {
      setEditSlot(null);
      return;
    }
    try {
      const res = await apiClient.post("/schedule/delete-weekly/", {
        id: slotId,
        day: editSlot.day,
        time_slot: editSlot.time_slot,
      });
      if (res.data.status === "success") {
        setMessage("Slot deleted successfully.");
        setSlots((prev) =>
          prev.filter(
            (s) => !(s.day === editSlot.day && s.time_slot === editSlot.time_slot)
          )
        );
        setEditSlot(null);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(res.data.message || "Error deleting slot.");
      }
    } catch (err) {
      console.error("Error deleting slot:", err);
      setMessage("Error deleting slot.");
    }
  };

  return (
    <div className="mt-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold mb-1">MY SCHEDULE</h1>
        <button
          onClick={() => {
            setIsEditMode((prev) => !prev);
            setEditSlot(null);
          }}
          className={`px-3 py-2 rounded ${
            isEditMode ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500"
          } text-white`}
        >
          {isEditMode ? "Done Editing" : "Edit Schedule"}
        </button>
      </div>

      <table className="border-collapse w-full mb-4 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-700 p-2 bg-neutral-900 text-gray-200">Time</th>
            {DAYS.map((day) => (
              <th key={day} className="border border-gray-700 p-2 bg-neutral-900 text-gray-200">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((timeSlot) => (
            <tr key={timeSlot}>
              <td className="border border-gray-700 p-2 font-medium bg-neutral-900 text-gray-200">
                {timeSlot}
              </td>
              {DAYS.map((day) => (
                <ScheduleCell
                  key={day}
                  day={day}
                  timeSlot={timeSlot}
                  course={getCourseFor(day, timeSlot)}
                  isEditMode={isEditMode}
                  onClick={() => handleCellClick(day, timeSlot)}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <AnimatePresence>
        {editSlot && (
          <motion.div
            key="editModal"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
            onClick={() => setEditSlot(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 p-4 rounded shadow-lg w-80 border border-gray-700"
            >
              <h3 className="text-lg font-semibold mb-2 text-white">
                Edit Slot ({editSlot.day} {editSlot.time_slot})
              </h3>
              {message && (
                <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-700">
                  {message}
                </div>
              )}
              <input
                className="border border-gray-600 bg-neutral-800 text-white p-2 w-full mb-4"
                placeholder="Course name"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
              />
              <div className="flex justify-between">
                {editSlot.id && editSlot.course && (
                  <button
                    onClick={handleDeleteSlot}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                  >
                    Delete
                  </button>
                )}
                <div className="space-x-2">
                  <button
                    onClick={() => setEditSlot(null)}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSlot}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

}
