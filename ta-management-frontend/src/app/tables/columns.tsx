"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Mail, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import ConfirmDialog from "@/app/tables/ConfirmDialog"
import apiClient from "@/lib/axiosClient"
import { useUser } from "@/components/general/user-data"

// — Data interfaces —
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

// — Reusable Email button —
function EmailButton({
  email,
  role,
  onClick,
}: {
  email: string
  role: "TA" | "Staff"
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

// — Courses columns, admin actions only —
export function useCourseColumns(onDataChange: () => void) {
  const { user } = useUser()

  return useMemo<ColumnDef<CourseData>[]>(() => {
    const cols: ColumnDef<CourseData>[] = [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Code <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "instructors",
        header: "Instructors",
        cell: ({ row }) => {
          const list = row.getValue<string[]>("instructors")
          return list.length ? list.join(", ") : "None"
        },
      },
    ]

    if (user?.isAuth && user.role === "ADMIN") {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const code = row.getValue<string>("code")
          const handleDelete = async () => {
            const res = await apiClient.delete(`/list/delete-course/${code}/`)
            if (res.data.status === "success") onDataChange()
            else alert(res.data.message)
          }
          return (
            <ConfirmDialog
              title="Delete Course?"
              description={`Delete course “${code}”? This cannot be undone.`}
              onConfirm={handleDelete}
            >
              <Button
                variant="destructive"
                size="icon"
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete {code}</span>
              </Button>
            </ConfirmDialog>
          )
        },
      })
    }

    return cols
  }, [user, onDataChange])
}

// — TAs columns, admin actions only —
export function useTAColumns(onDataChange: () => void) {
  const { user } = useUser()

  return useMemo<ColumnDef<TAData>[]>(() => {
    const cols: ColumnDef<TAData>[] = [
      {
        accessorFn: row => `${row.name} ${row.surname}`,
        id: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "advisor",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Advisor <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "program",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Program <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      { accessorKey: "student_id", header: "Student ID" },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.getValue("phone") || "-",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.getValue<string>("email")
          return (
            <div className="flex items-center justify-between w-full px-2">
              <span className="truncate">{email}</span>
              <EmailButton
                email={email}
                role="TA"
                onClick={(email, role) => {
                  // @ts-ignore
                  row.handleOpenMail?.(email, role)
                }}
              />
            </div>
          )
        },
      },
    ]

    if (user?.isAuth && user.role === "ADMIN") {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const email = row.getValue<string>("email")
          const { name, surname } = row.original as TAData
          const fullName = `${name} ${surname}`
          const handleDelete = async () => {
            const res = await apiClient.delete(`/list/delete-ta/${email}/`)
            if (res.data.status === "success") onDataChange()
            else alert(res.data.message)
          }
          return (
            <ConfirmDialog
              title="Delete TA?"
              description={`Delete TA “${fullName}”? This cannot be undone.`}
              onConfirm={handleDelete}
            >
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete {fullName}</span>
              </Button>
            </ConfirmDialog>
          )
        },
      })
    }

    return cols
  }, [user, onDataChange])
}

// — Staff columns, admin actions only —
export function useStaffColumns(onDataChange: () => void) {
  const { user } = useUser()

  return useMemo<ColumnDef<StaffData>[]>(() => {
    const cols: ColumnDef<StaffData>[] = [
      {
        accessorFn: row => `${row.name} ${row.surname}`,
        id: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "department",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Department <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "courses",
        header: "Courses Taught",
        cell: ({ row }) =>
          (row.getValue<string[]>("courses") || []).join(", ") || "None",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.getValue<string>("email")
          return (
            <div className="flex items-center justify-between w-full px-2">
              <span className="truncate">{email}</span>
              <EmailButton
                email={email}
                role="Staff"
                onClick={(email, role) => {
                  // @ts-ignore
                  row.handleOpenMail?.(email, role)
                }}
              />
            </div>
          )
        },
      },
    ]

    if (user?.isAuth && user.role === "ADMIN") {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const email = row.getValue<string>("email")
          // pull name & surname from the original object
          const { name, surname } = row.original as StaffData
          const fullName = `${name} ${surname}`
          const handleDelete = async () => {
            const res = await apiClient.delete(`/list/delete-staff/${email}/`)
            if (res.data.status === "success") onDataChange()
            else alert(res.data.message)
          }
          return (
            <ConfirmDialog
              title="Delete Instructor?"
              description={`Delete instructor “${fullName}”? This cannot be undone.`}
              onConfirm={handleDelete}
            >
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete {fullName}</span>
              </Button>
            </ConfirmDialog>
          )
        },
      })
    }

    return cols
  }, [user, onDataChange])
}
