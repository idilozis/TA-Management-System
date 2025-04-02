"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { PageLoader } from "@/components/ui/loading-spinner";

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

export default function ProctoringTA() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAssignedExams = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/exams/list-ta-exams/");
      if (response.data.status === "success") {
        setExams(response.data.exams);
        setError("");
      } else {
        setError(response.data.message || "Failed to load assigned exams.");
      }
    } catch {
      setError("Failed to fetch assigned exams.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignedExams();
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Proctoring Assignments</h2>
      {exams.length === 0 ? (
        <div>No assigned exams.</div>
      ) : (
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-gray-200 text-gray-800">
            <tr>
              <th className="py-2 px-4">Course</th>
              <th className="py-2 px-4">Date</th>
              <th className="py-2 px-4">Time</th>
              <th className="py-2 px-4">Classroom</th>
              <th className="py-2 px-4">Students</th>
            </tr>
          </thead>
          <tbody className="bg-gray-50">
            {exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-gray-100">
                <td className="text-center p-2">
                  {exam.course_code} - {exam.course_name}
                </td>
                <td className="text-center p-2">{exam.date}</td>
                <td className="text-center p-2">
                  {exam.start_time} - {exam.end_time}
                </td>
                <td className="text-center p-2">{exam.classroom_name}</td>
                <td className="text-center p-2">{exam.student_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
