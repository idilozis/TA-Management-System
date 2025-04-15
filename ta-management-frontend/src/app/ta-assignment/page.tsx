"use client"

import { useEffect, useState } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/general/app-sidebar"
import { useUser } from "@/components/general/user-data"
import { PageLoader } from "@/components/ui/loading-spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import apiClient from "@/lib/axiosClient"

interface Assignment {
  ta_email: string
  ta_name: string
  assignment_type: string
  load?: number
}

interface Section {
  id: number
  course_code: string
  section: number
  min_tas_required: number
  student_count: number
  assignments: Assignment[]
}

interface TA {
  email: string
  name: string
  surname: string
}

const ASSIGNMENT_OPTIONS = [
  { value: "load_1", label: "1 Load" },
  { value: "load_2", label: "2 Loads" },
  { value: "must_have", label: "Must-Have" },
  { value: "preferred", label: "Preferred" },
  { value: "avoid", label: "Avoid" },
  { value: "none", label: "None" },
]

export default function SimpleAssignmentMatrix() {
  const { user, loading: userLoading } = useUser()
  const [activeCell, setActiveCell] = useState<{ sectionId: number; taEmail: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<Section[]>([])
  const [tas, setTAs] = useState<TA[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const response = await apiClient.get("/taassign/get/")
      if (response.data.status === "success") {
        setSections(response.data.data as Section[])
        setTAs(response.data.ta_lookup as TA[])
      }
      setLoading(false)
    }
    if (user && !user.isTA) fetchData()
  }, [user])

  const handleAssignmentChange = async (sectionId: number, taEmail: string, value: string) => {
    await apiClient.post("/taassign/update/", {
      section_id: sectionId,
      ta_email: taEmail,
      assignment_type: value,
    })
    setSections(prev =>
      prev.map(section => {
        if (section.id === sectionId) {
          const updated = section.assignments.filter(a => a.ta_email !== taEmail)
          if (value !== "none") {
            const ta = tas.find(t => t.email === taEmail)
            if (ta) {
              updated.push({ ta_email: taEmail, ta_name: `${ta.name} ${ta.surname}`, assignment_type: value })
            }
          }
          return { ...section, assignments: updated }
        }
        return section
      })
    )
    setActiveCell(null)
  }

  const getAssignmentType = (section: Section, taEmail: string) => {
    const found = section.assignments.find(a => a.ta_email === taEmail)
    return found?.assignment_type || "none"
  }

  if (userLoading || loading) return <PageLoader />
  if (user?.isTA) return <div className="p-10 text-center">Only staff can view this page.</div>

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar user={user} />
        <SidebarInset className="p-6">
          <h1 className="text-2xl font-bold mb-4">TA Assignment Matrix</h1>
          <div className="overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Min TAs</TableHead>
                  {tas.map(ta => (
                    <TableHead key={ta.email}>{ta.name} {ta.surname}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map(section => (
                  <TableRow key={section.id}>
                    <TableCell>{section.course_code}</TableCell>
                    <TableCell>{section.section}</TableCell>
                    <TableCell>{section.min_tas_required}</TableCell>
                    {tas.map(ta => (
                      <TableCell
                        key={ta.email}
                        className="text-center cursor-pointer"
                        onClick={() => setActiveCell({ sectionId: section.id, taEmail: ta.email })}
                      >
                        {activeCell?.sectionId === section.id && activeCell?.taEmail === ta.email ? (
                          <Popover open onOpenChange={() => setActiveCell(null)}>
                            <PopoverTrigger asChild><div>-</div></PopoverTrigger>
                            <PopoverContent className="w-64">
                              <RadioGroup
                                defaultValue={getAssignmentType(section, ta.email)}
                                onValueChange={(val) => handleAssignmentChange(section.id, ta.email, val)}
                              >
                                {ASSIGNMENT_OPTIONS.map(opt => (
                                  <div key={opt.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt.value} id={`${section.id}-${ta.email}-${opt.value}`} />
                                    <Label htmlFor={`${section.id}-${ta.email}-${opt.value}`}>{opt.label}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          getAssignmentType(section, ta.email)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}