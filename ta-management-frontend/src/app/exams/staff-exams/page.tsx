"use client";

import StaffExamsModal from "@/app/exams/staff-exams/StaffExamsModal";
import { motion } from "framer-motion";

export default function MyExamsPage() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-4">My Exams</h1>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <StaffExamsModal />
      </motion.div>
    </div>
  );
}
