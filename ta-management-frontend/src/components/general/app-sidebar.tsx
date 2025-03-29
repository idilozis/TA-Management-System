"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, FileText, CheckCircle, SettingsIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserData } from "@/components/general/user-data";

type AppSidebarProps = {
  user: UserData | null;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // User Role Text
  const getRoleString = (user: UserData) => {
    if (user.isTA) { // TA Users
      return (
        <>
          {user.program} Student
          <br />
          Your Advisor: {user.advisor}
        </>
      );
    } else { // Staff Users
      return <>Staff of {user.department}</>;
    }
  };

  // Navigation items
  const navItems = [
    {
      name: "Home Page",
      path: "/home-page",
      icon: HomeIcon,
    },
    {
      name: "Exams",
      path: "/proctoring",
      icon: FileText,
    },
    {
      name: "Approve/Reject Requests",
      path: "/requests",
      icon: CheckCircle,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: SettingsIcon,
    },
  ];

  return (
    <Sidebar
      className="border-r border-zinc-200 bg-zinc-50 text-zinc-900
                 dark:border-zinc-800 dark:bg-black dark:text-white"
      collapsible="icon"
    >
      <SidebarHeader
        className={`border-b border-zinc-200 dark:border-zinc-800 p-0 ${
          isCollapsed ? "py-4" : ""
        }`}
      >
        <div
          className={`flex flex-col items-center px-6 py-4 text-center ${
            isCollapsed ? "py-0" : ""
          }`}
        >
          <img
            src="/blank-profile-icon.png"
            alt="Profile"
            className={`${
              isCollapsed ? "h-8 w-8 mb-0" : "mb-3 h-16 w-16"
            } rounded-full border border-zinc-300 dark:border-zinc-600`}
          />

          {/* Hide these elements when collapsed */}
          {!isCollapsed && user && (
            <>
              <h3 className="text-lg font-semibold">
                {user.name} {user.surname}
              </h3>
              <p className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-500">
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
                  <item.icon className="h-5 w-5 text-zinc-500 dark:text-zinc-300" />
                  <span className="ml-2">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-4">
        {/* Hide the logged in text when collapsed */}
        {!isCollapsed && user && (
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            Logged in as {user.email}
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );

}
