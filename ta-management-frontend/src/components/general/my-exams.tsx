"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";

interface Exam {
  id: number;
  course_code: string;
  course_name: string;
  date: string;
  start_time: string;
  end_time: string;
  classroom_name: string;
  num_proctors: number;
  student_count: number;
}

interface MyExamsProps {
  refreshTrigger?: number;
}

export default function MyExams({ refreshTrigger }: MyExamsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/proctoring/list-exams/");
      if (response.data.status === "success") {
        setExams(response.data.exams);
        setError("");
      } else {
        setError(response.data.message || "Failed to load exams");
      }
    } catch {
      setError("Failed to fetch exams");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExams();
  }, [refreshTrigger]); // Re-fetch exams on refreshTrigger change

  const handleDeleteExam = async (examId: number) => {
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      await apiClient.post("/proctoring/delete-exam/", { exam_id: examId });
      fetchExams(); // Refetch exams after deletion
    } catch {
      setError("Error deleting exam. Please try again.");
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading your exams...</div>;
  }

  return (
    <div className="overflow-x-auto">
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <table className="min-w-full border bg-white">
        <thead className="bg-gray-200">
          <tr className="text-red-800">
            <th className="py-2 px-4">Course</th>
            <th className="py-2 px-4">Date</th>
            <th className="py-2 px-4">Start - End</th>
            <th className="py-2 px-4">Classroom</th>
            <th className="py-2 px-4">Proctors</th>
            <th className="py-2 px-4">Students</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-red-50">
          {exams.map((exam) => (
            <tr className="text-blue-950" key={exam.id}>
              <td className="text-center p-3 whitespace-nowrap">{exam.course_code} - {exam.course_name}</td>
              <td className="text-center p-3 whitespace-nowrap">{exam.date}</td>
              <td className="text-center p-3 whitespace-nowrap">{exam.start_time} - {exam.end_time}</td>
              <td className="text-center p-3 whitespace-nowrap">{exam.classroom_name}</td>
              <td className="text-center p-3 whitespace-nowrap">{exam.num_proctors}</td>
              <td className="text-center p-3 whitespace-nowrap">{exam.student_count}</td>
              <td className="text-center p-3 whitespace-nowrap">
                <button
                  onClick={() => handleDeleteExam(exam.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
}
