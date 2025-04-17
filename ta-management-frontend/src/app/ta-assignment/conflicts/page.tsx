"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import apiClient from "@/lib/axiosClient"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Conflict {
  id: number
  ta_name: string
  ta_email: string
  course1_code: string
  course1_section: number
  course2_code: string
  course2_section: number
  conflict_type: "schedule" | "load" | "preference"
  description: string
  severity: "low" | "medium" | "high"
}

export default function ConflictsPage() {
  const { user, loading: userLoading } = useUser()
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch conflicts
        const response = await apiClient.get("/taassignment/conflicts/")
        if (response.data.status === "success") {
          setConflicts(response.data.conflicts)
        } else {
          setError("Failed to load conflicts")
        }
      } catch (err) {
        setError("Error loading data. Please try again.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user && !user.isTA) {
      fetchData()
    }
  }, [user])

  // Loading state
  if (userLoading || loading) {
    return <PageLoader />
  }

  // Access control - only staff can access
  if (user?.isTA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>Only staff members can access the TA assignment page.</p>
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "low":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case "schedule":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "load":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "preference":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar user={user} />
        <SidebarInset className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Assignment Conflicts</h1>
          </div>

          <Link href="/ta-assignment">
            <Button variant="outline" className="mb-6 flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Assignment Matrix
            </Button>
          </Link>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">Detected Conflicts</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No conflicts detected. All assignments look good!</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">TA</TableHead>
                        <TableHead className="font-semibold">Course 1</TableHead>
                        <TableHead className="font-semibold">Course 2</TableHead>
                        <TableHead className="font-semibold">Conflict Type</TableHead>
                        <TableHead className="font-semibold">Severity</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conflicts.map((conflict) => (
                        <TableRow key={conflict.id}>
                          <TableCell className="font-medium">
                            {conflict.ta_name}
                            <div className="text-xs text-muted-foreground">{conflict.ta_email}</div>
                          </TableCell>
                          <TableCell>
                            {conflict.course1_code} - {conflict.course1_section}
                          </TableCell>
                          <TableCell>
                            {conflict.course2_code} - {conflict.course2_section}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getConflictTypeColor(conflict.conflict_type)}>
                              {conflict.conflict_type.charAt(0).toUpperCase() + conflict.conflict_type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getSeverityColor(conflict.severity)}>
                              {conflict.severity.charAt(0).toUpperCase() + conflict.severity.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{conflict.description}</TableCell>
                          <TableCell>
                            <Link href={`/ta-assignment?highlight=${conflict.ta_email}`}>
                              <Button variant="outline" size="sm">
                                View in Matrix
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
