"use client";

import { useState } from "react";
import apiClient from "@/lib/axiosClient";
import { X } from "lucide-react";

// Type for user data: TA / Staff
export type UserData = {
  name: string;
  surname?: string; // Currently Staffs just have name without surnames
  email: string;
  isTA: boolean;
  program?: string;
  advisor?: string;
  courses?: string;
  department?: string;
};

interface SettingsModalProps {
  user: UserData;
  onClose: () => void;
  onUpdateUser: (updatedUser: UserData) => void;
}

export default function SettingsModal({ user, onClose, onUpdateUser }: SettingsModalProps) {
  const [name, setName] = useState(user.name || "");
  const [surname, setSurname] = useState(user.surname || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setMessage("");
    // Check if name or surname is empty.
    if (!name.trim() || !surname.trim()) {
        setMessage("Name and surname cannot be empty!");
        return;
    }

    // If a new password is entered, ensure it's at least 8 characters.
    if (password && password.length < 8) {
      setMessage("Password must be at least 8 characters!");
      return;
    }
    
    try {
      // Build payload without password if it's blank.
      const payload: { name: string; surname: string; password?: string } = {
        name,
        surname,
      };
      if (password) {
        payload.password = password;
      }
      const response = await apiClient.post("/auth/update-profile/", payload);
      setMessage(response.data.message || "Profile updated!");

      // Update local user data
      const updatedUser = { ...user, name, surname };
      onUpdateUser(updatedUser);
    } catch {
      setMessage("Update failed.");
    }
  };

  return (
    <div className="fixed inset-0 bg-blue-100 bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-md w-96 relative">
        {/* Close button */}
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl text-center font-semibold mb-4">Settings</h2>

        {/* Name field */}
        <label className="block mb-2">
          <span className="text-sm font-medium text-gray-700">Name</span>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {/* Surname field */}
        <label className="block mb-2">
          <span className="text-sm font-medium text-gray-700">Surname</span>
          <input
            type="text"
            className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
          />
        </label>

        {/* Password field */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-700">New Password</span>
          <input
            type="password"
            className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
            placeholder="Leave blank to keep current password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {message && (
          <p className="mb-2 text-sm">{message}</p>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
