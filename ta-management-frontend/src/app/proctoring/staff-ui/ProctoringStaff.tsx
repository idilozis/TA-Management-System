"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


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
  const [activeTab, setActiveTab] = useState<"unassigned" | "assigned">("unassigned")

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
    apiClient
      .get("/exams/list-exams/")
      .then((res) => {
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
    try {
      const res = await apiClient.post(`/proctoring/automatic-assignment/${exam.id}/`)
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
      await fetchAutoDetails(result.assignedTas)
      setShowAuto(true)
    } catch (err) {
      setError("Error during automatic assignment")
    }
  }

  async function confirmAuto() {
    if (!autoResult) return
    try {
      await apiClient.post(`/proctoring/confirm-assignment/${autoResult.examId}/`, {
        assigned_tas: autoResult.assignedTas,
      })
      setShowAuto(false)
      window.location.reload()
    } catch (err) {
      setError("Error confirming assignment")
    }
  }

  async function handleManual(exam: Exam) {
    setCurrentExam(exam)
    try {
      const res = await apiClient.get(`/proctoring/candidate-tas/${exam.id}/`)
      if (res.data.status !== "success") {
        setError("Failed loading TAs")
        return
      }
      setManualTAs(res.data.tas)
      setSelected([])
      setShowManual(true)
    } catch (err) {
      setError("Error loading candidate TAs")
    }
  }

  function toggle(email: string) {
    if (!currentExam) return
    if (selected.includes(email)) {
      setSelected(selected.filter((e) => e !== email))
    } else if (selected.length < currentExam.num_proctors) {
      setSelected([...selected, email])
    }
  }

  async function confirmManual() {
    if (!currentExam || selected.length !== currentExam.num_proctors) return
    try {
      await apiClient.post(`/proctoring/confirm-assignment/${currentExam.id}/`, {
        assigned_tas: selected,
      })
      setShowManual(false)
      window.location.reload()
    } catch (err) {
      setError("Error confirming assignment")
    }
  }

  if (loading) return <PageLoader />

  // Separate assigned and unassigned exams
  const unassignedExams = exams.filter((exam) => exam.assigned_tas.length === 0)
  const assignedExams = exams.filter((exam) => exam.assigned_tas.length > 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Proctoring</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        defaultValue="unassigned"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "unassigned" | "assigned")}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="unassigned" className="text-blue-600 font-medium">
            Unassigned Exams
          </TabsTrigger>
          <TabsTrigger value="assigned" className="text-blue-600 font-medium">
            Assigned Exams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unassigned">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-600">Unassigned Exams</CardTitle>
              <CardDescription>Exams that need proctors to be assigned</CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">All exams have been assigned proctors.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Course</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Room</TableHead>
                        <TableHead className="font-semibold text-center">Proctors Needed</TableHead>
                        <TableHead className="font-semibold text-center">Students</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedExams.map((exam) => (
                        <TableRow key={exam.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div>{exam.course_code}</div>
                            <div className="text-sm text-muted-foreground">{exam.course_name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                              {exam.date}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {exam.start_time} - {exam.end_time}
                          </TableCell>
                          <TableCell>{exam.classroom_name}</TableCell>
                          <TableCell className="text-center">{exam.num_proctors}</TableCell>
                          <TableCell className="text-center">{exam.student_count}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAuto(exam)}
                                className="bg-green-600 hover:bg-green-500 text-white"
                                size="sm"
                              >
                                Automatic
                              </Button>
                              <Button
                                onClick={() => handleManual(exam)}
                                className="bg-blue-600 hover:bg-blue-500 text-white"
                                size="sm"
                              >
                                Manual
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-600">Assigned Exams</CardTitle>
              <CardDescription>Exams with proctors already assigned</CardDescription>
            </CardHeader>
            <CardContent>
              {assignedExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No exams have been assigned proctors yet.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Course</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Room</TableHead>
                        <TableHead className="font-semibold text-center">Proctors</TableHead>
                        <TableHead className="font-semibold text-center">Students</TableHead>
                        <TableHead className="font-semibold">Assigned TAs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedExams.map((exam) => (
                        <TableRow key={exam.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div>{exam.course_code}</div>
                            <div className="text-sm text-muted-foreground">{exam.course_name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                              {exam.date}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {exam.start_time} - {exam.end_time}
                          </TableCell>
                          <TableCell>{exam.classroom_name}</TableCell>
                          <TableCell className="text-center">{exam.num_proctors}</TableCell>
                          <TableCell className="text-center">{exam.student_count}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {exam.assigned_tas.map((email) => (
                                <Badge
                                  key={email}
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-200 block"
                                >
                                  {email}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Automatic Assignment Dialog */}
      <Dialog open={showAuto} onOpenChange={setShowAuto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Automatically Assigned TAs</DialogTitle>
            <DialogDescription>
              {currentExam && `For ${currentExam.course_code} on ${currentExam.date}`}
            </DialogDescription>
          </DialogHeader>

          {autoResult && (
            <>
              {(autoResult.overrideInfo.consecutive_overridden ||
                autoResult.overrideInfo.ms_phd_overridden ||
                autoResult.overrideInfo.department_overridden) && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">Some restrictions were overridden:</div>
                    <ul className="list-disc pl-5 mt-1">
                      {autoResult.overrideInfo.consecutive_overridden && <li>Day-before/after restriction</li>}
                      {autoResult.overrideInfo.ms_phd_overridden && <li>MS/PhD rule</li>}
                      {autoResult.overrideInfo.department_overridden && <li>Department restriction</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-[200px] rounded-md border p-4">
                {autoTAs.map((ta) => (
                  <div key={ta.email} className="py-2 border-b last:border-0">
                    <div className="font-medium">
                      {ta.first_name} {ta.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{ta.email}</div>
                  </div>
                ))}
              </ScrollArea>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuto(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAuto} className="bg-green-600 hover:bg-green-500">
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Assignment Dialog */}
      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manual TA Assignment</DialogTitle>
            <DialogDescription>
              {currentExam && (
                <>
                  For {currentExam.course_code} on {currentExam.date} ({selected.length}/{currentExam.num_proctors}{" "}
                  selected)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Assignable TAs
              </h3>
              <ScrollArea className="h-[200px] rounded-md border">
                {manualTAs
                  .filter((t) => t.assignable)
                  .map((ta) => (
                    <div
                      key={ta.email}
                      className={`flex justify-between items-center p-3 border-b cursor-pointer hover:bg-muted/50 ${
                        selected.includes(ta.email) ? "bg-blue-50 border-blue-200" : ""
                      }`}
                      onClick={() => toggle(ta.email)}
                    >
                      <div>
                        <div className="font-medium">
                          {ta.first_name} {ta.last_name}
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
                <AlertCircle className="h-4 w-4 mr-1" /> Not Assignable TAs
              </h3>
              <ScrollArea className="h-[150px] rounded-md border">
                {manualTAs
                  .filter((t) => !t.assignable)
                  .map((ta) => (
                    <div key={ta.email} className="p-3 border-b">
                      <div className="font-medium">
                        {ta.first_name} {ta.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{ta.email}</div>
                      <div className="mt-1 text-sm text-red-600 italic">{ta.reason}</div>
                    </div>
                  ))}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmManual}
              disabled={!currentExam || selected.length !== currentExam.num_proctors}
              className={
                currentExam && selected.length === currentExam.num_proctors
                  ? "bg-green-600 hover:bg-green-500"
                  : undefined
              }
            >
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

