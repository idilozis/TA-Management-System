"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import apiClient from "@/lib/axiosClient";
import { AppSidebar } from "@/components/general/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useUser, UserData } from "@/components/general/user-data";

// Data types
interface TA {
  name: string;
  surname: string;
  email: string;
  ta_type: string; // "FT" or "PT" – if empty, default to "FT"
}

interface Course {
  code: string;
  name: string;
}

interface Staff {
  name: string;
  surname: string;
  email: string;
}

interface AssignmentPreference {
  staff: Staff;
  course: Course;
  min_load: number;
  max_load: number;
  num_graders: number;
  must_have_ta: TA[];
  preferred_tas: TA[];
  preferred_graders: TA[];
  avoided_tas: TA[];
}

// For react-select
interface TAOption {
  value: string;
  label: string;
}

export default function TAAssignmentPage() {
  const { user, loading } = useUser();
  const [preferences, setPreferences] = useState<AssignmentPreference[]>([]);
  const [selectedPreference, setSelectedPreference] = useState<AssignmentPreference | null>(null);

  // For general TAs
  const [selectedTAOptions, setSelectedTAOptions] = useState<TAOption[]>([]);
  // For graders
  const [selectedGraderOptions, setSelectedGraderOptions] = useState<TAOption[]>([]);

  // React-select options for TAs
  const [taOptions, setTAOptions] = useState<TAOption[]>([]);

  // For global messages (success/failure)
  const [globalMessage, setGlobalMessage] = useState("");

  // For error modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalErrors, setModalErrors] = useState<string[]>([]); // store errors as array

  useEffect(() => {
    // Fetch assignment preferences
    apiClient
      .get("/assignment/list-preferences/")
      .then((res) => {
        if (res.data.status === "success") {
          setPreferences(res.data.assignments);
        } else {
          setGlobalMessage(res.data.message || "Error fetching preferences.");
        }
      })
      .catch((err) => {
        console.error("Error fetching preferences:", err);
        setGlobalMessage("Error fetching preferences.");
      });
  }, []);

  useEffect(() => {
    // Fetch all TAs (role=TA) for the multi-select
    apiClient
      .get("/list/tas/", { params: { role: "TA" } })
      .then((res) => {
        if (res.data.status === "success") {
          const opts: TAOption[] = res.data.tas.map((ta: any) => {
            const type = ta.ta_type ? ta.ta_type : "FT"; // default to "FT"
            return {
              value: ta.email,
              label: `${ta.name} ${ta.surname} (${type})`,
            };
          });
          setTAOptions(opts);
        } else {
          console.error("Error fetching TA list:", res.data.message);
        }
      })
      .catch((err) => {
        console.error("Error fetching TA list:", err);
      });
  }, []);

  // Validate general TA assignment
  function validateTAAssignment(): string[] {
    if (!selectedPreference) return [];
    const errs: string[] = [];
    const selectedEmails = selectedTAOptions.map((o) => o.value);

    // Calculate load
    let totalLoad = 0;
    selectedEmails.forEach((email) => {
      // Attempt to parse PT/FT from the label in taOptions
      const opt = taOptions.find((t) => t.value === email);
      const isFT = opt && opt.label.includes("(FT)");
      totalLoad += isFT ? 2 : 1;
    });

    if (totalLoad < selectedPreference.min_load) {
      errs.push(`Total load (${totalLoad}) is below the minimum required (${selectedPreference.min_load}).`);
    }
    if (totalLoad > selectedPreference.max_load) {
      errs.push(`Total load (${totalLoad}) exceeds the maximum allowed (${selectedPreference.max_load}).`);
    }

    // Must-have TAs
    selectedPreference.must_have_ta.forEach((ta) => {
      if (!selectedEmails.includes(ta.email)) {
        errs.push(`Must-have TA ${ta.name} ${ta.surname} (${ta.email}) is missing.`);
      }
    });

    return errs;
  }

  // Validate grader assignment
  function validateGraderAssignment(): string[] {
    if (!selectedPreference) return [];
    const errs: string[] = [];
    // No specific load validation, just ensure not empty
    if (selectedGraderOptions.length === 0) {
      errs.push("Please assign at least one grader.");
    }
    return errs;
  }

  // Submit TAs
  async function handleAssignTAs() {
    if (!selectedPreference) return;
    const errors = validateTAAssignment();
    if (errors.length > 0) {
      setModalErrors(errors);
      setModalVisible(true);
      return;
    }
    try {
      const assignedEmails = selectedTAOptions.map((o) => o.value);
      const res = await apiClient.post("/assignment/assign-tas/", {
        course_code: selectedPreference.course.code,
        assigned_tas: assignedEmails,
      });
      if (res.data.status === "success") {
        setGlobalMessage("General TA(s) assigned successfully.");
        setSelectedTAOptions([]);
      } else {
        setGlobalMessage(`Error: ${res.data.message}`);
      }
    } catch (err) {
      console.error("Error assigning TAs:", err);
      setGlobalMessage("Error assigning TAs.");
    }
  }

  // Submit graders
  async function handleAssignGraders() {
    if (!selectedPreference) return;
    const errors = validateGraderAssignment();
    if (errors.length > 0) {
      setModalErrors(errors);
      setModalVisible(true);
      return;
    }
    try {
      const assignedEmails = selectedGraderOptions.map((o) => o.value);
      const res = await apiClient.post("/assignment/assign-graders/", {
        course_code: selectedPreference.course.code,
        assigned_graders: assignedEmails,
      });
      if (res.data.status === "success") {
        setGlobalMessage("Grader(s) assigned successfully.");
        setSelectedGraderOptions([]);
      } else {
        setGlobalMessage(`Error: ${res.data.message}`);
      }
    } catch (err) {
      console.error("Error assigning graders:", err);
      setGlobalMessage("Error assigning graders.");
    }
  }

  // Confirm the warnings in the modal
  function confirmModal() {
    setModalVisible(false);
    // If there were TA errors, we proceed with TAs anyway
    if (selectedTAOptions.length > 0) {
      handleAssignTAs();
    }
    // If there were grader errors, we proceed with graders
    else if (selectedGraderOptions.length > 0) {
      handleAssignGraders();
    }
  }

  function cancelModal() {
    setModalVisible(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Loading...
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        No user found.
      </div>
    );
  }
  if (user.isTA) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Only staff can access this page.
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-gray-100">
        <AppSidebar user={user as UserData} />
        <SidebarInset className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6">Manual TA and Grader Assignment</h1>
          {globalMessage && (
            <p className="mb-4 text-red-600">{globalMessage}</p>
          )}

          <h2 className="text-2xl font-semibold mb-4">Assignment Preferences</h2>
          {preferences.length === 0 ? (
            <p>No assignment preferences found.</p>
          ) : (
            <table className="min-w-full border border-gray-300 text-sm mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border">Instructor</th>
                  <th className="px-4 py-2 border">Course</th>
                  <th className="px-4 py-2 border">Min Load</th>
                  <th className="px-4 py-2 border">Max Load</th>
                  <th className="px-4 py-2 border">Number of Graders</th>
                  <th className="px-4 py-2 border">Must-Have TA</th>
                  <th className="px-4 py-2 border">Preferred TAs</th>
                  <th className="px-4 py-2 border">Preferred Graders</th>
                  <th className="px-4 py-2 border">Avoided TAs</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {preferences.map((pref, idx) => {
                  const combinedCourse = `${pref.course.code} ${pref.course.name}`;
                  return (
                    <tr key={idx} className="border-b odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2 border">
                        {pref.staff.name} {pref.staff.surname}
                        <br />
                        <span className="text-xs text-gray-500">
                          {pref.staff.email}
                        </span>
                      </td>
                      <td className="px-4 py-2 border">{combinedCourse}</td>
                      <td className="px-4 py-2 border">{pref.min_load}</td>
                      <td className="px-4 py-2 border">{pref.max_load}</td>
                      <td className="px-4 py-2 border">{pref.num_graders}</td>
                      <td className="px-4 py-2 border">
                        {pref.must_have_ta.length
                          ? pref.must_have_ta
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {pref.preferred_tas.length
                          ? pref.preferred_tas
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {pref.preferred_graders.length
                          ? pref.preferred_graders
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        {pref.avoided_tas.length
                          ? pref.avoided_tas
                              .map((ta) => `${ta.name} ${ta.surname}`)
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-2 border">
                        <button
                          onClick={() => {
                            setSelectedPreference(pref);
                            setSelectedTAOptions([]);
                            setSelectedGraderOptions([]);
                            setGlobalMessage("");
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {selectedPreference && (
            <div className="border p-4 rounded bg-white mb-6">
              <h2 className="text-xl font-bold mb-2">
                {selectedPreference.course.code} {selectedPreference.course.name}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                Instructor: {selectedPreference.staff.name} {selectedPreference.staff.surname} ({selectedPreference.staff.email})
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Minimum Load: {selectedPreference.min_load}, Maximum Load: {selectedPreference.max_load} (FT=2, PT=1)
              </p>

              {/* General TAs */}
              <h3 className="text-md font-semibold mb-2">Assign General TA(s)</h3>
              <Select
                isMulti
                options={taOptions}
                value={selectedTAOptions}
                onChange={(newVal) => setSelectedTAOptions(newVal as TAOption[])}
                placeholder="Search and select TAs..."
                className="basic-multi-select mb-2"
                classNamePrefix="select"
              />
              <button
                onClick={handleAssignTAs}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Assign TAs
              </button>

              <hr className="my-4" />

              {/* Graders */}
              <h3 className="text-md font-semibold mb-2">Assign Grader(s)</h3>
              <Select
                isMulti
                options={taOptions}
                value={selectedGraderOptions}
                onChange={(newVal) => setSelectedGraderOptions(newVal as TAOption[])}
                placeholder="Search and select graders..."
                className="basic-multi-select mb-2"
                classNamePrefix="select"
              />
              <button
                onClick={handleAssignGraders}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Assign Graders
              </button>
            </div>
          )}

          {modalVisible && (
            <div className="fixed inset-0 flex items-center justify-center">
              <div className="bg-white p-6 rounded shadow-lg max-w-md">
                <h2 className="text-xl font-bold mb-4">Confirm Assignment</h2>
                <div className="mb-4 text-red-700">
                  {modalErrors.map((err, idx) => (
                    <div key={idx}>{err}</div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={cancelModal}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
