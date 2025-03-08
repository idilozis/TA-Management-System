"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBarIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

const ReportsPage = () => {
  const generateReport = async () => {
    try {
      // URL to match your Flask backend endpoint
      const response = await fetch("http://localhost:5000/reports");
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      const data = await response.json();
      // Simply alert the message returned by the backend
      alert(data.message);
    } catch (error) {
      console.error(error);
      alert("Error generating report");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Card>
          <CardHeader className="flex items-center">
            <ChartBarIcon className="h-10 w-10 text-indigo-500" />
            <CardTitle className="ml-3">Workload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-gray-600">
              View total TA workload details by semester, course, and task type.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center">
            <DocumentTextIcon className="h-10 w-10 text-green-500" />
            <CardTitle className="ml-3">Proctoring Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-gray-600">
              Explore detailed reports on exam proctor assignments and historical data.
            </p>
          </CardContent>
        </Card>
        
      </div>
      
      <div className="mt-8">
        <button
            onClick={generateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Generate Report
        </button>
      </div>

    </div>
  );
};

export default ReportsPage;
