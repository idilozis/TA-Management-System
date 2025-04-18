"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/axiosClient";

// Data Interfaces
export interface Course {
  id: number;
  code: string;
  name: string;
}

export interface UserData {
  name: string;
  surname: string;
  email: string;
  isTA: boolean;
  isAuth?: boolean;

  // TAs
  program?: string;
  advisor?: string;

  // Staff
  department?: string;
  courses?: Course[];

  // Authorized User
  role?: 'SECRETARY' | 'DEAN' | 'ADMIN';
}

/**
 * A custom hook that handles fetching the user from /auth/whoami/ (backend),
 * optionally fetching courses for Staff, and redirects to /login if needed.
 */
export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiClient
      .get("/auth/whoami/")
      .then((res) => {
        if (res.data.status !== "success") {
          // Not authenticated => redirect to login page
          router.push("/auth/login");
          return null; // don't continue
        }

        const userData: UserData = res.data.user;

        // If Staff, fetch courses
        if (!userData.isTA && !userData.isAuth) {
          return apiClient
            .get("/exams/list-courses/")
            .then((coursesRes) => {
              if (coursesRes.data.status === "success") {
                userData.courses = coursesRes.data.courses;
              }
              return userData;
            })
            .catch(() => userData); // if fetch fails, just return user anyway
        }

        // If TA or Authorized user, no extra fetch needed
        return userData;
      })
      .then((finalUser) => {
        if (finalUser) {
          setUser(finalUser);
        }
      })
      .catch(() => {
        router.push("/auth/login");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  return { user, setUser, loading };
}
