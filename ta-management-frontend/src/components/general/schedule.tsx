"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/axiosClient";

// ENUM
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

export default function TAWeeklySchedule() {
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [editSlot, setEditSlot] = useState<SlotData | null>(null);
  const [newCourse, setNewCourse] = useState("");
  const [message, setMessage] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch schedule on component mount
  useEffect(() => {
    apiClient
      .get("/schedule/list-weekly/")
      .then((res) => {
        if (res.data.status === "success") {
          setSlots(res.data.slots);
        }
      })
      .catch((err) => {
        console.error("Error fetching schedule:", err);
      });
  }, []);

  const getCourseFor = (day: string, timeSlot: string) => {
    const slot = slots.find((s) => s.day === day && s.time_slot === timeSlot);
    return slot ? slot.course : "";
  };

  const getSlotId = (day: string, timeSlot: string) => {
    const slot = slots.find((s) => s.day === day && s.time_slot === timeSlot);
    return slot?.id;
  };

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
    setMessage(""); // Clear any old message
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
        setTimeout(() => setMessage(""), 3000);

        const newID = res.data.slot_id;
        const updatedSlots = [...slots];
        const index = updatedSlots.findIndex(
          (s) => s.day === editSlot.day && s.time_slot === editSlot.time_slot
        );
        if (index >= 0) {
          updatedSlots[index].course = newCourse.trim();
          updatedSlots[index].id = newID;
        } else {
          updatedSlots.push({
            id: newID,
            day: editSlot.day,
            time_slot: editSlot.time_slot,
            course: newCourse.trim(),
          });
        }
        setSlots(updatedSlots);
        setEditSlot(null);
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
        setSlots(
          slots.filter(
            (s) =>
              !(s.day === editSlot.day && s.time_slot === editSlot.time_slot)
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

  // Returns CSS classes for each cell, based on whether it has a course or is in edit mode
  const getCellClass = (day: string, timeSlot: string) => {
    const course = getCourseFor(day, timeSlot);
    if (!course) {
      // Empty slot
      return isEditMode
        ? "bg-neutral-900 cursor-pointer hover:bg-neutral-800 text-gray-200"
        : "bg-neutral-900 text-gray-300";
    }
    // Has a course
    return isEditMode
      ? "bg-blue-800 text-white cursor-pointer hover:bg-blue-700"
      : "bg-green-800 text-white";
  };

  return (
    <div className="mt-6 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold mb-1">MY SCHEDULE</h1>
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setEditSlot(null); // Automatically close modal when toggling edit mode
          }}
          className={`px-3 py-2 rounded ${
            isEditMode
              ? "bg-green-600 hover:bg-green-500"
              : "bg-blue-600 hover:bg-blue-500"
          } text-white`}
        >
          {isEditMode ? "Done Editing" : "Edit Schedule"}
        </button>
      </div>

      {/* Dark table */}
      <table className="border-collapse w-full mb-4 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-700 p-2 bg-neutral-900 w-1/6 text-gray-200">
              Time
            </th>
            {DAYS.map((d) => (
              <th
                key={d}
                className="border border-gray-700 p-2 bg-neutral-900 w-1/6 text-gray-200"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((ts) => (
            <tr key={ts}>
              <td className="border border-gray-700 p-2 font-medium text-gray-200 bg-neutral-900">
                {ts}
              </td>
              {DAYS.map((day) => (
                <td
                  key={day}
                  className={cn(
                    "border border-gray-700 p-2 text-center transition-colors",
                    getCellClass(day, ts)
                  )}
                  onClick={() => handleCellClick(day, ts)}
                >
                  {getCourseFor(day, ts) || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {editSlot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setEditSlot(null)}
        >
          {/* Modal */}
          <div
            className="bg-neutral-900 p-4 rounded shadow-lg w-80 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 text-white">
              Edit Slot ({editSlot.day} {editSlot.time_slot})
            </h3>

            {/* Display the message in the modal */}
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
          </div>
        </div>
      )}
    </div>
  );
}

// A tiny helper so we can conditionally combine classes
function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
