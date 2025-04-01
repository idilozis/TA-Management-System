"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

// Data interfaces
export interface CourseData {
  code: string
  name: string
  instructors: string[]
}
export interface TAData {
  email: string
  name: string
  surname: string
  advisor: string
  program: string
  student_id: string
  phone: string
}
export interface StaffData {
  email: string
  name: string
  surname: string
  department: string
  courses: string[]
}

// Email button component
function EmailButton({
  email,
  role,
  onClick,
}: { 
  email: string; 
  role: "TA" | "Staff"; 
  onClick: (email: string, role: "TA" | "Staff") => void 
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 rounded-full p-0 text-blue-600 hover:bg-emerald-300"
      onClick={() => onClick(email, role)}
    >
      <Mail className="h-3.5 w-3.5" />
      <span className="sr-only">Email {email}</span>
    </Button>
  )
}

// Course columns
export const courseColumns: ColumnDef<CourseData>[] = [
  {
    accessorKey: "code",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "instructors",
    header: "Instructors",
    cell: ({ row }) => {
      const instructors = row.getValue("instructors") as string[]
      return instructors.length === 0 ? "None" : instructors.join(", ")
    },
  },
]

// TA columns
export const taColumns: ColumnDef<TAData>[] = [
  {
    accessorFn: (row) => `${row.name} ${row.surname}`,
    id: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "advisor",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Advisor
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "program",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Program
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "student_id",
    header: "Student ID",
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string
      return phone || "-"
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return (
        <div className="flex items-center justify-between w-full px-2">
          <span className="truncate">{email}</span>
          <EmailButton
            email={email}
            role="TA"
            onClick={(email, role) => {
              // This will be provided by the table component
              // @ts-ignore - we'll provide this prop when rendering
              row.handleOpenMail?.(email, role)
            }}
          />
        </div>
      )
    },
  },
]

// Staff columns
export const staffColumns: ColumnDef<StaffData>[] = [
  {
    accessorFn: (row) => `${row.name} ${row.surname}`,
    id: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "department",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Department
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "courses",
    header: "Courses Taught",
    cell: ({ row }) => {
      const courses = row.getValue("courses") as string[]
      return courses.length === 0 ? "None" : courses.join(", ")
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string
      return (
        <div className="flex items-center justify-between w-full px-2">
          <span className="truncate">{email}</span>
          <EmailButton
            email={email}
            role="Staff"
            onClick={(email, role) => {
              // This will be provided by the table component
              // @ts-ignore - we'll provide this prop when rendering
              row.handleOpenMail?.(email, role)
            }}
          />
        </div>
      )
    },
  },
]
