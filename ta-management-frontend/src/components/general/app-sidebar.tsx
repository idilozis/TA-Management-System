"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, FileText, CheckCircle, UserCog, LogOut, SquareChartGantt,  CalendarOff, Archive, FolderArchive, BookOpenCheck, Repeat } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
         SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import type { UserData } from "@/components/general/user-data";
import apiClient from "@/lib/axiosClient";

type AppSidebarProps = {
  user: UserData | null;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // User Role Text
  const getRoleString = (user: UserData) => {
    // TAs
    if (user.isTA) {
      return (
        <>
          {user.program} Student
          <br />
          Advisor: {user.advisor}
        </>
      );
    }
    // Staff (Instructors)
    if (!user.isTA && !user.isAuth) {
      return <>Department of {user.department}</>;
    }
    // Authorized Users
    switch (user.role) {
      case "DEAN":
        return <>Dean Office</>;
      case "SECRETARY":
        return <>Department Secretary</>;
      case "ADMIN":
        return <>System Administrator</>;
      default:
        return <>Authorized User</>;
    }
  };

  // NAVIGATION ITEMS
  const navItems = [
    {
      name: "Home Page",
      path: "/home-page",
      icon: HomeIcon,
    },
    ...(user && user.isTA
      ? [
          {
            name: "Duties",
            path: "/ta-duties",
            icon: CheckCircle,
          },
        ]
      : []),
      ...(user && user.isTA
        ? [
            {
              name: "Leave Requests",
              path: "/ta-leaves",
              icon: CalendarOff,
            },
          ]
        : []),  
    ...(user && !user.isTA && !user.isAuth
      ? [
          {
            name: "Requests",
            path: "/requests",
            icon: CheckCircle,
          },
        ]
      : []),
    {
      name: user?.isAuth ? "Leave Requests" : "Proctoring",
      path: "/proctoring",
      icon: FileText,
    },
    ...(user && user.isTA
      ? [
          {
            name: "Swaps",
            path: "/swaps",       
            icon: Repeat,
          },
        ]
      : []),
      ...(user && user.isAuth && user.role==="SECRETARY"
        ? [{ name:"Proctoring Assignments", path:"/staff-swaps", icon:Repeat }]
        : []),      
    ...(user && !user.isTA && user.isAuth && user.role == "DEAN"
      ? [
          {
            name: "Exams",
            path: "/dean-exams",
            icon: BookOpenCheck,
          },
        ]
      : []),
    ...(user && !user.isTA
      ? [
          {
            name: "Assignment",
            path: "/ta-assignment",
            icon: SquareChartGantt,
          },
        ]
      : []),
    ...(user && !user.isTA
      ? [
          {
            name: "Documents",
            path: "/documents",
            icon: FolderArchive,
          },
        ]
      : []),
    {
      name: "Records",
      path: "/tables",
      icon: Archive,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: UserCog,
    },
  ];

  // Logout handler
  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout/");
    } catch (error) {
      console.error("Logout API call failed", error);
    } finally {
      router.push("/");
    }
  };

  return (
    <Sidebar
      className="border-r border-gray-200 bg-white text-gray-900"
      collapsible="icon"
    >
      <SidebarHeader className={`border-b border-gray-200 p-0 ${isCollapsed ? "py-4" : ""}`}>
        <div className={`flex flex-col items-center px-6 py-4 text-center ${isCollapsed ? "py-0" : ""}`}>
          <img
            src="/blank-profile-icon.png"
            alt="Profile"
            className={`${isCollapsed ? "h-8 w-8 mb-0" : "mb-3 h-16 w-16"} rounded-full border border-gray-300`}
          />
          {/* Hide these elements when collapsed */}
          {!isCollapsed && user && (
            <>
              <h3 className="text-lg font-semibold">{user.name} {user.surname}</h3>
              <p className="mt-1 text-center text-xs text-gray-500">
                {getRoleString(user)}
              </p>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.path}
                tooltip={item.name}
              >
                <Link href={item.path} className="flex items-center">
                  <item.icon className="h-5 w-5 text-gray-500" />
                  <span className="ml-2">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-gray-200 p-4">
        {!isCollapsed && user && (
          <>
            <div className="text-xs text-gray-500">
              Logged in as {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 inline-flex items-center text-xs text-red-500 hover:underline"
            >
              <LogOut className="mr-1 h-4 w-4" />
              <span>Log Out</span>
            </button>
          </>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );

}
