"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle, AlertTriangle, CheckCircle2, AlertOctagon
} from "lucide-react"
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
  assigned_tas: Array<{ email: string; first_name: string; last_name: string }>
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
  const [isLoading, setIsLoading] = useState<"auto"|"manual"|null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const [autoResult, setAutoResult] = useState<AssignmentResult|null>(null)
  const [autoTAs, setAutoTAs] = useState<TA[]>([])

  const [manualTAs, setManualTAs] = useState<TA[]>([])
  const [selected, setSelected] = useState<string[]>([])

  const formatDate = (iso: string) => {
    const [y,m,d] = iso.split("-")
    return `${d}.${m}.${y}`
  }

  // -------------------
  // Automatic
  // -------------------
  async function handleAuto() {
    setError(""); setIsLoading("auto")
    try {
      const res = await apiClient.post(`/proctoring/automatic-dean-assignment/${exam.id}/`)
      if (!res.data.success) throw new Error()
      setAutoResult({
        examId: exam.id,
        assignedTas: res.data.assigned_tas,
        overrideInfo: res.data.override_info,
      })
      // fetch details
      const detail = await apiClient.post("/proctoring/ta-details/", {
        emails: res.data.assigned_tas
      })
      setAutoTAs(detail.data.tas)
      setStep("auto")
    } catch {
      setError("Error during automatic assignment")
    } finally {
      setIsLoading(null)
    }
  }

  async function confirmAuto() {
    if (!autoResult) return
    setIsConfirming(true)
    try {
      await apiClient.post(`/proctoring/confirm-dean-assignment/${exam.id}/`, {
        assigned_tas: autoResult.assignedTas
      })
      onAssigned(); onClose()
    } catch {
      setError("Error confirming assignment")
    } finally {
      setIsConfirming(false)
    }
  }

  // -------------------
  // Manual
  // -------------------
  async function handleManual() {
    setError(""); setIsLoading("manual")
    try {
      const res = await apiClient.get(`/proctoring/candidate-tas-dean/${exam.id}/`)
      if (res.data.status !== "success") throw new Error()
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

  async function confirmManual() {
    if (selected.length !== exam.num_proctors) return
    setIsConfirming(true)
    try {
      await apiClient.post(`/proctoring/confirm-dean-assignment/${exam.id}/`, {
        assigned_tas: selected
      })
      onAssigned(); onClose()
    } catch {
      setError("Error confirming assignment")
    } finally {
      setIsConfirming(false)
    }
  }

  // -------------------
  // Categorization
  // -------------------
  function sortByAssignedThenWorkload(a: TA, b: TA) {
    if (a.already_assigned && !b.already_assigned) return -1
    if (!a.already_assigned && b.already_assigned) return 1
    return (a.workload - b.workload)
  }

  const SOFT_REASONS = ["day-before", "day-after", "ms/phd only"]

  const assignableTAs = manualTAs
    .filter(t => t.assignable)
    .sort(sortByAssignedThenWorkload)

  const softTAs = manualTAs
    .filter(t => {
      // penalty ⇒ soft
      if (t.assignable && (t.penalty ?? 0) > 0) return true
      // else all reasons soft?
      if (!t.assignable && t.reason) {
        const rs = t.reason.split(";").map(r=>r.trim().toLowerCase())
        return rs.length>0 && rs.every(r=>SOFT_REASONS.some(s=>r.includes(s)))
      }
      return false
    })
    .sort(sortByAssignedThenWorkload)

  const hardTAs = manualTAs
    .filter(t => !assignableTAs.includes(t) && !softTAs.includes(t))
    .sort(sortByAssignedThenWorkload)

  // -------------------
  // Render
  // -------------------
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Proctoring for {exam.course_codes.join(", ")}</DialogTitle>
          <DialogDescription>
            {exam.course_codes.join(", ")} — {formatDate(exam.date)} ({exam.start_time}-{exam.end_time})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "choose" && (
          <div className="flex gap-4 justify-center py-8">
            <Button
              onClick={handleAuto}
              disabled={isLoading !== null}
              className="bg-green-600 hover:bg-green-500"
            >
              {isLoading==="auto"?"Loading...":"Automatic"}
            </Button>
            <Button
              onClick={handleManual}
              disabled={isLoading !== null}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isLoading==="manual"?"Loading...":"Manual"}
            </Button>
          </div>
        )}

        {step==="auto" && autoResult && (
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
                    {autoResult.overrideInfo.ms_phd_overridden    && <li>MS/PhD only</li>}
                    {autoResult.overrideInfo.department_overridden&& <li>Department</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <ScrollArea className="h-[200px] rounded-md border p-4 mb-4">
              {autoTAs.map(t => (
                <div key={t.email} className="py-2 border-b last:border-0">
                  <div className="font-medium">{t.first_name} {t.last_name}</div>
                  <div className="text-sm text-muted-foreground">{t.email}</div>
                </div>
              ))}
            </ScrollArea>
            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={()=>setStep("choose")}>Back</Button>
              <Button
                onClick={confirmAuto}
                className="bg-green-600 hover:bg-green-500"
                disabled={isConfirming}
              >
                {isConfirming?"Confirming...":"Confirm"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step==="manual" && (
          <>
            <div className="space-y-4 mb-4">
              {/* Assignable */}
              <div>
                <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Assignable TAs
                </h3>
                <ScrollArea className="h-[180px] rounded-md border">
                  {assignableTAs.map(t => (
                    <div
                      key={t.email}
                      onClick={()=>toggle(t.email)}
                      className={`
                        flex justify-between items-center p-2 border-b cursor-pointer hover:bg-muted/50
                        ${t.already_assigned?"bg-yellow-50 border-yellow-200":""}
                        ${selected.includes(t.email)?"bg-blue-50 border-blue-200":""}
                      `}
                    >
                      <div>
                        <div className="font-medium flex items-center">
                          {t.first_name} {t.last_name}
                          {t.already_assigned && (
                            <Badge className="ml-2 bg-yellow-100 text-yellow-800">Course TA</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{t.email}</div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800">
                        Workload: {t.workload}
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Soft */}
              <div>
                <h3 className="text-sm font-medium text-amber-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Soft Restrictions
                  <span className="ml-2 font-normal text-muted-foreground">
                    (can override: day-before/after, MS/PhD)
                  </span>
                </h3>
                <ScrollArea className="h-[150px] rounded-md border">
                  {softTAs.map(t => (
                    <div
                      key={t.email}
                      onClick={()=>toggle(t.email)}
                      className={`
                        flex justify-between items-center p-2 border-b cursor-pointer hover:bg-muted/50
                        bg-amber-50 border-amber-200
                        ${selected.includes(t.email)?"bg-blue-50 border-blue-200":""}
                      `}
                    >
                      <div>
                        <div className="font-medium">{t.first_name} {t.last_name}</div>
                        <div className="text-sm text-muted-foreground">{t.email}</div>
                        <div className="mt-1 text-sm text-amber-600 italic">
                          {t.reason || "Day-before/after conflict"}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800">
                        Workload: {t.workload}
                      </Badge>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {/* Hard */}
              <div>
                <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                  <AlertOctagon className="h-4 w-4 mr-1" /> Hard Restrictions
                  <span className="ml-2 font-normal text-muted-foreground">
                    (cannot select)
                  </span>
                </h3>
                <ScrollArea className="h-[120px] rounded-md border">
                  {hardTAs.map(t => (
                    <div key={t.email} className="p-2 border-b last:border-0">
                      <div className="font-medium">{t.first_name} {t.last_name}</div>
                      <div className="text-sm text-muted-foreground">{t.email}</div>
                      <div className="mt-1 text-sm text-red-600 italic">{t.reason}</div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="flex justify-end space-x-2">
              <Button variant="outline" onClick={()=>setStep("choose")}>Back</Button>
              <Button
                onClick={confirmManual}
                disabled={selected.length !== exam.num_proctors || isConfirming}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isConfirming 
                  ? "Confirming..." 
                  : `Confirm (${selected.length}/${exam.num_proctors})`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
