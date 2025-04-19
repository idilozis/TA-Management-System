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

  if (loading) return <p>Loading workload chart…</p>;
  if (!data.length) return <p>No workload data available.</p>;

  const labels = data.map((r) => r.name);
  const workloads = data.map((r) => r.workload);

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Workload (hrs)",
            data: workloads,
            backgroundColor: "rgba(13,186,133,0.6)",
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Top 20 TA Workloads" },
        },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}
