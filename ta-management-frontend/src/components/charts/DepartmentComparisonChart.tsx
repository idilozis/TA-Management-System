"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import apiClient from "@/lib/axiosClient";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CompData {
  labels: string[];
  proctorCounts: number[];
  dutyCounts: number[];
}

export function DepartmentComparisonChart() {
  const [data, setData] = useState<CompData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<CompData>("/charts/department-comparison/")
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error("Error fetching department comparison data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading comparison chart…</p>;
  if (!data) return <p className="text-red-500">Failed to load comparison data.</p>;

  return (
    <Bar
      data={{
        labels: data.labels,
        datasets: [
          {
            label: "Proctoring",
            data: data.proctorCounts,
            backgroundColor: "rgba(13,186,133,0.7)",
          },
          {
            label: "TA Duties",
            data: data.dutyCounts,
            backgroundColor: "rgba(59,130,246,0.7)",
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Department-wise Proctoring and Duties" },
        },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}
