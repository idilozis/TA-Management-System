"use client"

import * as React from "react"
import { useState } from "react"
import apiClient from "@/lib/axiosClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface DeanExam {
  id: number
  course_codes: string[]
  date: string
  start_time: string
  end_time: string
  classrooms: string[]
  num_proctors: number
  student_count: number
  assigned_tas: Array<{
    email: string
    first_name: string
    last_name: string
  }>
}

interface TA {
  email: string
  first_name: string
  last_name: string
  workload: number
  program: string
  department: string
  assignable: boolean
  reason?: string
  penalty?: number
  already_assigned?: boolean
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

export default function DeanProctorModal({
  exam,
  onClose,
  onAssigned,
}: {
  exam: DeanExam
  onClose: () => void
  onAssigned: () => void
}) {
  const [step, setStep] = useState<"choose" | "auto" | "manual">("choose")
  const [error, setError] = useState("")
  const [autoResult, setAutoResult] = useState<AssignmentResult | null>(null)
  const [autoTAs, setAutoTAs] = useState<TA[]>([])
  const [manualTAs, setManualTAs] = useState<TA[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [isConfirming, setIsConfirming] = useState(false)
  const [isLoading, setIsLoading] = useState<"auto" | "manual" | null>(null)
  const formatDate = (iso: string) => {
    const [year, month, day] = iso.split("-");
    return `${day}.${month}.${year}`;
  };

  // run automatic assignment
  async function handleAuto() {
    setError("")
    setIsLoading("auto")
    try {
      const res = await apiClient.post(`/proctoring/automatic-dean-assignment/${exam.id}/`)
      if (!res.data.success) {
        setError("Automatic assignment failed")
        return
      }
      const result: AssignmentResult = {
        examId: exam.id,
        assignedTas: res.data.assigned_tas,
        overrideInfo: res.data.override_info,
      }
      setAutoResult(result)
      // fetch TA details for display
      const detailRes = await apiClient.post("/proctoring/ta-details/", { emails: result.assignedTas })
      setAutoTAs(detailRes.data.tas)
      setStep("auto")
    } catch {
      setError("Error during automatic assignment")
    } finally {
      setIsLoading(null)
    }
  }

  // confirm automatic assignment
  async function confirmAuto() {
    if (!autoResult) return
    setIsConfirming(true)
    try {
      await apiClient.post(`/proctoring/confirm-dean-assignment/${exam.id}/`, {
        assigned_tas: autoResult.assignedTas,
      })
      onAssigned()
      onClose()
    } catch {
      setError("Error confirming assignment")
    } finally {
      setIsConfirming(false)
    }
  }

  // run manual candidate fetch
  async function handleManual() {
    setError("")
    setIsLoading("manual")
    try {
      const res = await apiClient.get(`/proctoring/candidate-tas-dean/${exam.id}/`)
      if (res.data.status !== "success") {
        setError("Failed loading candidate TAs")
        return
      }
      setManualTAs(res.data.tas)
      setSelected([])
      setStep("manual")
    } catch {
      setError("Error loading candidate TAs")
    } finally {
      setIsLoading(null)
    }
  }

  function toggle(email: string) {
    if (selected.includes(email)) {
      setSelected(selected.filter((e) => e !== email))
    } else if (selected.length < exam.num_proctors) {
      setSelected([...selected, email])
    }
  }

  // confirm manual assignment
  async function confirmManual() {
    if (selected.length !== exam.num_proctors) return
    setIsConfirming(true)
    try {
      await apiClient.post(`/proctoring/confirm-dean-assignment/${exam.id}/`, {
        assigned_tas: selected,
      })
      onAssigned()
      onClose()
    } catch {
      setError("Error confirming assignment")
    } finally {
      setIsConfirming(false)
    }
  }
  const assignableTAs = manualTAs
    .filter((t) => t.assignable)
    .sort((a, b) => {
      // 1) Course TAs (already_assigned) first
      if (a.already_assigned && !b.already_assigned) return -1
      if (!a.already_assigned && b.already_assigned) return 1
      // 2) then by penalty
      const pa = (a.penalty ?? 0) - (b.penalty ?? 0)
      if (pa !== 0) return pa
      // 3) then by workload
      return a.workload - b.workload
    })
    
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Assignment Method First</DialogTitle>
          <DialogDescription>
            For {exam.course_codes.join(", ")} on {formatDate(exam.date)} (
            {exam.start_time}-{exam.end_time})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: choose automatic vs manual */}
        {step === "choose" && (
          <div className="flex gap-4 justify-center py-8">
            <Button 
              onClick={handleAuto} 
              className="bg-blue-600 hover:bg-blue-500"
              disabled={isLoading !== null}
            >
              {isLoading === "auto" ? "Loading..." : "Automatic"}
            </Button>
            <Button 
              onClick={handleManual} 
              className="bg-blue-600 hover:bg-blue-500"
              disabled={isLoading !== null}
            >
              {isLoading === "manual" ? "Loading..." : "Manual"}
            </Button>
          </div>
        )}

        {/* Step 2: Automatic results */}
        {step === "auto" && autoResult && (
          <>
            {(autoResult.overrideInfo.consecutive_overridden ||
              autoResult.overrideInfo.ms_phd_overridden ||
              autoResult.overrideInfo.department_overridden) && (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">Restrictions overridden:</div>
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {autoResult.overrideInfo.consecutive_overridden && <li>Day-before/after</li>}
                    {autoResult.overrideInfo.ms_phd_overridden && <li>MS/PhD rule</li>}
                    {autoResult.overrideInfo.department_overridden && <li>Department</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[200px] rounded-md border p-4 mb-4">
              {autoTAs.map((ta) => (
                <div key={ta.email} className="py-2 border-b last:border-0">
                  <div className="font-medium">{ta.first_name} {ta.last_name}</div>
                  <div className="text-sm text-muted-foreground">{ta.email}</div>
                </div>
              ))}
            </ScrollArea>
            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
              <Button
                onClick={confirmAuto}
                className="bg-blue-600 hover:bg-blue-500"
                disabled={isConfirming}
              >
                {isConfirming ? "Confirming..." : "Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Manual assignment */}
        {step === "manual" && (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Assignable TAs
                </h3>
                <ScrollArea className="h-[180px] rounded-md border">
                {assignableTAs.map((ta) => (
                  <div
                    key={ta.email}
                    className={`
                      flex justify-between items-center p-2 border-b cursor-pointer hover:bg-muted/50
                      ${ta.already_assigned ? "bg-yellow-50 border-yellow-200" : ""}
                      ${selected.includes(ta.email) ? "bg-blue-50 border-blue-200" : ""}
                    `}
                    onClick={() => toggle(ta.email)}
                  >
                    <div>
                      <div className="font-medium flex items-center">
                        {ta.first_name} {ta.last_name}
                        {ta.already_assigned && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                            Course TA
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{ta.email}</div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800">
                      Workload: {ta.workload}
                    </Badge>
                  </div>
                ))}
              </ScrollArea>
              </div>

              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" /> Non-Assignable TAs
                </h3>
                <ScrollArea className="h-[120px] rounded-md border">
                  {manualTAs.filter((t) => !t.assignable).map((ta) => (
                    <div key={ta.email} className="p-2 border-b last:border-0">
                      <div className="font-medium">{ta.first_name} {ta.last_name}</div>
                      <div className="text-sm text-muted-foreground">{ta.email}</div>
                      <div className="mt-1 text-sm text-red-600 italic">{ta.reason}</div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep("choose")}>Back</Button>
              <Button
                onClick={confirmManual}
                disabled={selected.length !== exam.num_proctors || isConfirming}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isConfirming ? "Confirming..." : `Confirm (${selected.length}/${exam.num_proctors})`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
