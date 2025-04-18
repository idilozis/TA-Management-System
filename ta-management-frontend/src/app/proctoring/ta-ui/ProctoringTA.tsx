"use client";
import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming")

  const fetchAssignedExams = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get("/exams/list-ta-exams/")
      if (response.data.status === "success") {
        setExams(response.data.exams)
        setError("")
      } else {
        setError(response.data.message || "Failed to load assigned exams.")
      }
    } catch {
      setError("Failed to fetch assigned exams.")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAssignedExams()
  }, [])

  if (loading) return <PageLoader />

  // Sort exams by date (most recent first)
  const sortedExams = [...exams].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.start_time}`)
    const dateB = new Date(`${b.date} ${b.start_time}`)
    return dateA.getTime() - dateB.getTime()
  })

  // Separate upcoming and past exams
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingExams = sortedExams.filter((exam) => {
    const examDate = new Date(exam.date)
    examDate.setHours(0, 0, 0, 0)
    return examDate >= today
  })

  const pastExams = sortedExams.filter((exam) => {
    const examDate = new Date(exam.date)
    examDate.setHours(0, 0, 0, 0)
    return examDate < today
  })

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
        defaultValue="upcoming"
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "upcoming" | "past")}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming" className="text-blue-600 font-medium">
            Upcoming Exams
          </TabsTrigger>
          <TabsTrigger value="past" className="text-blue-600 font-medium">
            Past Exams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-blue-600">Upcoming Exams</CardTitle>
                <CardDescription>Exams you are assigned to proctor in the future</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No upcoming exams assigned.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Course</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Classroom</TableHead>
                        <TableHead className="font-semibold">Students</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingExams.map((exam) => (
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
                          <TableCell>{exam.student_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-blue-600">Past Exams</CardTitle>
                <CardDescription>Exams you have previously proctored</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {pastExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No past exams found.</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Course</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Time</TableHead>
                        <TableHead className="font-semibold">Classroom</TableHead>
                        <TableHead className="font-semibold">Students</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastExams.map((exam) => (
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
                          <TableCell>{exam.student_count}</TableCell>
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
    </div>
  )
}