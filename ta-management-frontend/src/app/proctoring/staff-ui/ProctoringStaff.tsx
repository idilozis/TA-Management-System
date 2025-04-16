"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/axiosClient";
import { useRouter } from "next/navigation";
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
  assigned_tas: string[];
}

interface AssignmentResult {
  examId: number;
  assignedTas: string[];
  overrideInfo: any;
}

export default function ProctoringStaff() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Holds the result from the automatic assignment popover.
  const [assignmentResult, setAssignmentResult] = useState<AssignmentResult | null>(null);
  // Controls popover visibility for assignment review.
  const [showPopover, setShowPopover] = useState(false);
  const router = useRouter();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/exams/list-exams/");
      if (response.data.status === "success") {
        const sortedExams = response.data.exams.sort(
          (a: Exam, b: Exam) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setExams(sortedExams);
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
  }, []);

  const handleAutomaticAssignment = async (examId: number) => {
    try {
      const response = await apiClient.post(`/proctoring/automatic-assignment/${examId}/`);
      if (response.data.success) {
        setAssignmentResult({
          examId,
          assignedTas: response.data.assigned_tas,
          overrideInfo: response.data.override_info,
        });
        setShowPopover(true);
      } else {
        alert("Automatic assignment failed: " + response.data.message);
      }
    } catch (err) {
      alert("Error during automatic assignment.");
    }
  };

  const handleManualAssignment = (examId: number) => {
    router.push(`/proctoring/manual-assignment/${examId}`);
  };

  const handleAcceptAssignment = async () => {
    if (!assignmentResult) return;
    try {
      const response = await apiClient.post(
        `/proctoring/confirm-assignment/${assignmentResult.examId}/`,
        { assigned_tas: assignmentResult.assignedTas }
      );
      if (response.data.success) {
        alert("Assignment confirmed.");
        fetchExams();
      } else {
        alert("Error confirming assignment: " + response.data.message);
      }
    } catch (err) {
      alert("Error confirming assignment.");
    } finally {
      setShowPopover(false);
      setAssignmentResult(null);
    }
  };

  const handleRejectAssignment = () => {
    alert("Assignment rejected. Please consider manual assignment.");
    setShowPopover(false);
    setAssignmentResult(null);
  };

  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Proctoring Assignment - Exams</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-gray-200 text-gray-800">
            <tr>
              <th className="py-2 px-4 w-40 whitespace-nowrap">Course</th>
              <th className="py-2 px-4 w-28 whitespace-nowrap">Date</th>
              <th className="py-2 px-4 w-32 whitespace-nowrap">Start - End</th>
              <th className="py-2 px-4 w-32 whitespace-nowrap">Classroom</th>
              <th className="py-2 px-4 w-28 whitespace-nowrap">Proctors</th>
              <th className="py-2 px-4 w-28 whitespace-nowrap">Students</th>
              <th className="py-2 px-4 w-64 whitespace-nowrap">Actions / Assigned TAs</th>
            </tr>
          </thead>
          <tbody className="bg-gray-50">
            {exams.map((exam) => (
              <tr className="hover:bg-gray-100" key={exam.id}>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.course_code} - {exam.course_name}
                </td>
                <td className="text-center p-3 whitespace-nowrap">{exam.date}</td>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.start_time} - {exam.end_time}
                </td>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.classroom_name}
                </td>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.num_proctors}
                </td>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.student_count}
                </td>
                <td className="text-center p-3 whitespace-nowrap">
                  {exam.assigned_tas && exam.assigned_tas.length > 0 ? (
                    <div className="space-y-1">
                      {exam.assigned_tas.map((ta, index) => (
                        <div key={index} className="text-sm font-medium">
                          {ta}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleAutomaticAssignment(exam.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Automatic Assignment
                      </button>
                      <button
                        onClick={() => handleManualAssignment(exam.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Manual Assignment
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPopover && assignmentResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-96 p-6">
            <h2 className="text-xl font-bold mb-4">Review Assigned TAs</h2>
            <ul className="mb-4">
              {assignmentResult.assignedTas.map((ta, index) => (
                <li key={index} className="mb-1">
                  {ta}
                </li>
              ))}
            </ul>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleRejectAssignment}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptAssignment}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
