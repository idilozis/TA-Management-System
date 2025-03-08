import Login from "./auth/login/page";
import { Navbar } from "@heroui/navbar";
import { Tooltip } from "@heroui/react";

export default function TA_Management_System() {
  return (
    <div>

      {/* Hero UI Navbar with Tooltip on the Title */}
      <Navbar className="px-6 py-4 bg-blue-900 text-gray-100">
        <Tooltip content="CS 319 Project - Team 7" showArrow>
          <h1 className="text-xl font-bold cursor-help">TA Management System</h1>
        </Tooltip>
      </Navbar>

      {/* Login Component */}
      <div className="bg-blue-100">
        <Login />
      </div>

    </div>
  );
}
