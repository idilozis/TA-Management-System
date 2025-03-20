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
              !(
                s.day === editSlot.day && s.time_slot === editSlot.time_slot
              )
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

  const getCellClass = (course: string) => {
    if (!course) return ""; // no colour
    return isEditMode ? "bg-blue-50" : "bg-green-100";
  };

  return (
    <div className="mt-6">
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">MY SCHEDULE</h2>
        <button
            onClick={() => {
                setIsEditMode(!isEditMode);
                setEditSlot(null); // Automatically close modal when toggling edit mode
            }}
            className={`px-3 py-2 rounded ${isEditMode ? "bg-green-500 text-white" : "bg-blue-600 text-white"}`}
            >
            {isEditMode ? "Done Editing" : "Edit Schedule"}
        </button>
      </div>

      <table className="border-collapse w-full mb-4">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-50 w-1/6">Time</th>
            {DAYS.map((d) => (
              <th key={d} className="border p-2 bg-gray-50 w-1/6">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIME_SLOTS.map((ts) => (
            <tr key={ts}>
              <td className="border p-2 font-medium text-gray-700">{ts}</td>
              {DAYS.map((day) => {
                const course = getCourseFor(day, ts);
                const cellClass = getCellClass(course);
                return (
                  <td
                    key={day}
                    className={`border p-2 text-center ${cellClass} ${
                      isEditMode ? "cursor-pointer hover:bg-gray-100" : ""
                    }`}
                    onClick={() => handleCellClick(day, ts)}
                  >
                    {course || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {editSlot && (
        <div
          className="fixed inset-0 bg-blue-100 bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setEditSlot(null)}
        >
          <div
            className="bg-white p-4 rounded shadow-lg w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              Edit Slot ({editSlot.day} {editSlot.time_slot})
            </h3>

            {/* Display the message in the modal */}
            {message && (
              <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-700">
                {message}
              </div>
            )}

            <input
              className="border p-2 w-full mb-4"
              placeholder="Course name"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
            />

            <div className="flex justify-between">
              {editSlot.id && editSlot.course && (
                <button
                  onClick={handleDeleteSlot}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              )}

              <div className="space-x-2">
                <button
                  onClick={() => setEditSlot(null)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveSlot}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
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
