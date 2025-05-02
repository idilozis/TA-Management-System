"use client"

import { useEffect, useState } from "react"
import apiClient from "@/lib/axiosClient"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TARecord {
  name: string;
  workload: number;
}

export function TopWorkloadChart() {
  const [data, setData] = useState<TARecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<TARecord[]>("/charts/ta-workload-data/")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Error fetching TA workload data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formattedData = data.map((item) => ({
    name: item.name,
    Workload: item.workload,
  }))

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Top 20 TA Workloads</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Visualizing the distribution of workload hours among TAs
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        {loading ? (
          <div className="space-y-2 p-6">
            <Skeleton className="h-[250px] w-full rounded-md" />
          </div>
        ) : !data.length ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No workload data available.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                height={60}
                interval={0}
                angle={-45}
                textAnchor="end"
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={40}
                label={{
                  value: "Hours",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { textAnchor: "middle", fontSize: 12, fill: "hsl(var(--foreground))" },
                }}
              />
              <Tooltip
                formatter={(value) => [`${value} hrs`, "Workload"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              />
              <Legend wrapperStyle={{ paddingTop: 15, fontSize: 12 }} />
              <Bar dataKey="Workload" fill="#1e40af" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
