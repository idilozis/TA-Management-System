"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";

interface AddExamModalProps {
  onClose: () => void;
}

interface CourseOption {
  id: number;
  code: string;
  name: string;
}

export default function AddExamModal({ onClose }: AddExamModalProps) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [numProctors, setNumProctors] = useState(1);
  const [classroomName, setClassroomName] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch staff's courses from /proctoring/list-courses/
  useEffect(() => {
    apiClient
      .get("/proctoring/list-courses/")
      .then((res) => {
        if (res.data.status === "success") {
          setCourses(res.data.courses);
        }
      })
      .catch((err) => {
        console.error("Error fetching staff courses:", err);
        setError("Failed to load courses. Please try again.");
      });
  }, []);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    // Basic validations
    if (!selectedCourse || !date || !startTime || !endTime || !classroomName) {
      setError("Please fill in all required fields.");
      setIsSubmitting(false);
      return;
    }

    // Validate start time is before end time
    if (startTime >= endTime) {
      setError("Start time must be before end time.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post("/proctoring/create-exam/", {
        course_id: selectedCourse,
        date,
        start_time: startTime,
        end_time: endTime,
        num_proctors: numProctors,
        classroom_name: classroomName,
        student_count: studentCount,
      });
      
      if (response.data.status === "success") {
        setMessage(response.data.message || "Exam created successfully!");
        // Reset form after successful creation
        setSelectedCourse("");
        setDate("");
        setStartTime("");
        setEndTime("");
        setNumProctors(1);
        setClassroomName("");
        setStudentCount(0);
        
        // Close the modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.message || "Error creating exam");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error creating exam. Please try again.");
      console.error("Error creating exam:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-blue-100 bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* clicking outside closes modal */}
      <div
        className="bg-white p-6 rounded shadow-md w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Add Exam</h2>

        {message && (
          <div className="mb-4 p-2 bg-green-100 border border-green-300 text-green-800 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-300 text-red-800 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateExam} className="space-y-4">
          {/* Course selection */}
          <div>
            <label className="block mb-1 font-medium">Course <span className="text-red-500">*</span></label>
            <select
              className="border p-2 w-full"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              required
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block mb-1 font-medium">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="border p-2 w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block mb-1 font-medium">Start Time <span className="text-red-500">*</span></label>
            <input
              type="time"
              className="border p-2 w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block mb-1 font-medium">End Time <span className="text-red-500">*</span></label>
            <input
              type="time"
              className="border p-2 w-full"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          {/* Classroom Name */}
          <div>
            <label className="block mb-1 font-medium">Classroom Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              className="border p-2 w-full"
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
              required
              placeholder="e.g., Room 101"
            />
          </div>

          {/* Num Proctors */}
          <div>
            <label className="block mb-1 font-medium">Number of Proctors</label>
            <input
              type="number"
              min={1}
              className="border p-2 w-full"
              value={numProctors}
              onChange={(e) => setNumProctors(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {/* Student Count */}
          <div>
            <label className="block mb-1 font-medium">Student Count</label>
            <input
              type="number"
              min={0}
              className="border p-2 w-full"
              value={studentCount}
              onChange={(e) => setStudentCount(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-3 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}