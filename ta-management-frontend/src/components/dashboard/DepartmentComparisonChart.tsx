"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CompData {
  labels: string[]
  proctorCounts: number[]
  dutyCounts: number[]
}

export function DepartmentComparisonChart() {
  const [data, setData] = useState<CompData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get<CompData>("/charts/department-comparison/")
      .then((res) => {
        setData(res.data)
      })
      .catch((err) => {
        console.error("Error fetching department comparison data:", err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Define a colorful palette for departments
  const departmentColors = [
    "#4ade80", // green
    "#60a5fa", // blue
    "#f472b6", // pink
    "#fb923c", // orange
    "#a78bfa", // purple
    "#facc15", // yellow
  ]

  // Transform the data for recharts
  const chartData = data?.labels.map((label, index) => ({
    department: label,
    Proctoring: data.proctorCounts[index],
    "TA Duties": data.dutyCounts[index],
    proctorColor: departmentColors[index % departmentColors.length],
    dutyColor: departmentColors[(index + 3) % departmentColors.length], // offset to get different colors
  }))

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Department-wise Proctoring and Duties</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Comparing proctoring and TA duties distribution across departments
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        {loading ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-[250px] w-full rounded-md" />
          </div>
        ) : !data ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <p className="text-sm text-red-500">Failed to load comparison data.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} width={30} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              />
              <Legend wrapperStyle={{ paddingTop: 15, fontSize: 12 }} />
              <Bar dataKey="Proctoring" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="TA Duties" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
