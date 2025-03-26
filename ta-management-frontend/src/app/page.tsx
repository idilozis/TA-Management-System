import Login from "./auth/login/page";
import { Navbar } from "@heroui/navbar";
import { Tooltip } from "@heroui/react";

export default function TA_Management_System() {
  return (
    <div>
     {/* <Navbar className="px-6 py-4 bg-black text-white border-b border-gray-700">
      <Tooltip content="CS 319 Project - Team 7" showArrow>
        <div className="flex items-center space-x-3 cursor-help">
          <img src="/favicon.ico" alt="Logo" className="h-6 w-6" />
          <h1 className="text-xl font-bold">TA Management System</h1>
        </div>
      </Tooltip>
    </Navbar> */}



      {/* Login Component */}
      <div className="bg-blue-100">
        <Login />
      </div>

    </div>
  );
}
