"use client"

import React, { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { PageLoader } from "@/components/ui/loading-spinner"

interface Exam {
  id: number
  course_code: string
  course_name: string
  date: string
  start_time: string
  end_time: string
  classroom_name: string
  num_proctors: number
  student_count: number
  assigned_tas: string[]
}

interface TA {
  id: number
  email: string
  first_name: string
  last_name: string
  workload: number
  program: string
  department: string
  assignable: boolean
  reason?: string
  penalty?: number
}

interface AssignmentResult {
  examId: number
  assignedTas: string[]
  overrideInfo: {
    consecutive_overridden: boolean
    ms_phd_overridden: boolean
    department_overridden: boolean
  }
}

export default function ProctorStaff() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // automatic
  const [autoResult, setAutoResult] = useState<AssignmentResult | null>(null)
  const [autoTAs, setAutoTAs] = useState<TA[]>([])
  const [showAuto, setShowAuto] = useState(false)

  // manual
  const [showManual, setShowManual] = useState(false)
  const [currentExam, setCurrentExam] = useState<Exam | null>(null)
  const [manualTAs, setManualTAs] = useState<TA[]>([])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    apiClient.get("/exams/list-exams/")
      .then(res => {
        if (res.data.status === "success") {
          setExams(res.data.exams)
        } else {
          setError(res.data.message || "Failed to load exams")
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [])

  // fetch details (names) for auto-assigned emails
  async function fetchAutoDetails(emails: string[]) {
    const res = await apiClient.post("/proctoring/ta-details/", { emails })
    if (res.data.success) {
      setAutoTAs(res.data.tas)
    }
  }

  async function handleAuto(exam: Exam) {
    setCurrentExam(exam)
    const res = await apiClient.post(`/proctoring/automatic-assignment/${exam.id}/`)
    if (!res.data.success) {
      return alert("Auto failed")
    }
    const result: AssignmentResult = {
      examId: exam.id,
      assignedTas: res.data.assigned_tas,
      overrideInfo: res.data.override_info,
    }
    setAutoResult(result)
    await fetchAutoDetails(result.assignedTas)
    setShowAuto(true)
  }

  async function confirmAuto() {
    if (!autoResult) return
    await apiClient.post(`/proctoring/confirm-assignment/${autoResult.examId}/`, {
      assigned_tas: autoResult.assignedTas
    })
    setShowAuto(false)
    window.location.reload()
  }

  async function handleManual(exam: Exam) {
    setCurrentExam(exam)
    const res = await apiClient.get(`/proctoring/candidate-tas/${exam.id}/`)
    if (res.data.status !== "success") {
      return alert("Failed loading TAs")
    }
    setManualTAs(res.data.tas)
    setSelected([])
    setShowManual(true)
  }

  function toggle(email: string) {
    if (!currentExam) return
    if (selected.includes(email)) {
      setSelected(selected.filter(e => e !== email))
    } else if (selected.length < currentExam.num_proctors) {
      setSelected([...selected, email])
    }
  }

  async function confirmManual() {
    if (!currentExam || selected.length !== currentExam.num_proctors) return
    await apiClient.post(`/proctoring/confirm-assignment/${currentExam.id}/`, {
      assigned_tas: selected
    })
    setShowManual(false)
    window.location.reload()
  }

  if (loading) return <PageLoader />
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Proctoring</h1>
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            {["Course","Date","Time","Room","#Proctors","#Students","Actions"].map(h => (
              <th key={h} className="px-2 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {exams.map(exam => (
            <tr key={exam.id} className="hover:bg-gray-50">
              <td className="px-2 py-1">{exam.course_code}</td>
              <td className="px-2 py-1">{exam.date}</td>
              <td className="px-2 py-1">{exam.start_time}-{exam.end_time}</td>
              <td className="px-2 py-1">{exam.classroom_name}</td>
              <td className="px-2 py-1 text-center">{exam.num_proctors}</td>
              <td className="px-2 py-1 text-center">{exam.student_count}</td>
              <td className="px-2 py-1">
                {exam.assigned_tas.length > 0
                  ? exam.assigned_tas.map(e => <div key={e}>{e}</div>)
                  : <>
                      <button
                        onClick={() => handleAuto(exam)}
                        className="bg-green-500 text-white px-2 rounded mr-1"
                      >Automatic</button>
                      <button
                        onClick={() => handleManual(exam)}
                        className="bg-blue-500 text-white px-2 rounded"
                      >Manual</button>
                    </>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Automatic Assignment popup */}
      {showAuto && autoResult && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-80">
            <h2 className="text-lg mb-2">Automatically Assigned</h2>
            {(autoResult.overrideInfo.consecutive_overridden ||
              autoResult.overrideInfo.ms_phd_overridden ||
              autoResult.overrideInfo.department_overridden) && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mb-2 text-sm">
                <strong>Some restrictions overridden:</strong>
                <ul className="list-disc ml-4">
                  {autoResult.overrideInfo.consecutive_overridden && <li>Day-before/after</li>}
                  {autoResult.overrideInfo.ms_phd_overridden && <li>MS/PhD rule</li>}
                  {autoResult.overrideInfo.department_overridden && <li>Department</li>}
                </ul>
              </div>
            )}
            <div className="mb-2 max-h-40 overflow-y-auto">
              {autoTAs.map(ta => (
                <div key={ta.email} className="border-b py-1">
                  {ta.first_name} {ta.last_name} - {ta.email}
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowAuto(false)} className="px-2 py-1 bg-red-500 text-white rounded">
                Reject
              </button>
              <button onClick={confirmAuto} className="px-2 py-1 bg-green-600 text-white rounded">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Assignment popup */}
      {showManual && currentExam && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-full max-w-2xl">
            <h2 className="text-lg mb-2">
              Manual - {currentExam.course_code} ({selected.length}/{currentExam.num_proctors})
            </h2>

            <h3 className="text-green-700">Assignable</h3>
            <div className="border max-h-48 overflow-y-auto mb-2">
              {manualTAs.filter(t => t.assignable).map(t => (
                <div
                  key={t.email}
                  className={`flex justify-between px-2 py-1 border-b cursor-pointer ${
                    selected.includes(t.email) ? "bg-blue-50" : ""
                  }`}
                  onClick={() => toggle(t.email)}
                >
                  <span>{t.first_name} {t.last_name} - {t.email}</span>
                  <span className="text-sm">workload: {t.workload}</span>
                </div>
              ))}
            </div>

            <h3 className="text-red-700">Not assignable</h3>
            <div className="border max-h-40 overflow-y-auto mb-2 text-sm">
              {manualTAs.filter(t => !t.assignable).map(t => (
                <div key={t.email} className="px-2 py-1 border-b">
                  {t.first_name} {t.last_name} – <em>{t.reason}</em>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowManual(false)} className="px-2 py-1 bg-gray-500 text-white rounded">
                Cancel
              </button>
              <button
                disabled={selected.length !== currentExam.num_proctors}
                onClick={confirmManual}
                className={`px-2 py-1 rounded ${
                  selected.length === currentExam.num_proctors
                    ? "bg-green-600 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
