"use client";

import { useState, useEffect } from "react";
import { BellIcon } from "lucide-react";
import apiClient from "@/lib/axiosClient";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

type NotificationItem = {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationPopover() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Fetch unread count once on mount
  useEffect(() => {
    fetchNotificationCount();
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const { data } = await apiClient.get("/notifications/count");
      if (data.status === "success") {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Fetch unread notifications when popover opens
  const fetchNotifications = async () => {
    try {
      const { data } = await apiClient.get("/notifications/list");
      if (data.status === "success") {
        setNotifications(data.notifications);
        setUnreadCount(data.notifications.length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Mark one notification as read
  const markNotificationAsRead = async (id: number) => {
    try {
      const { data } = await apiClient.post(`/notifications/mark-read/${id}/`);
      if (data.status === "success") {
        // Re-fetch to see the updated unread list
        fetchNotifications();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all unread notifications as read
  const markAllAsRead = async () => {
    try {
      const { data } = await apiClient.post("/notifications/mark-all-read/");
      if (data.status === "success") {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Handle the popover open/close
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // If opening, fetch the unread notifications
      fetchNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="relative">
          <BellIcon className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="max-h-80 overflow-y-auto w-120">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-xs text-red-600 text-left">
            You have {unreadCount} unread notification(s).
          </h3>

          {notifications.length > 0 && (
            <button onClick={markAllAsRead} className="text-blue-600 hover:underline text-sm">
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-600 py-2">No new notifications.</p>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="flex justify-between items-start border-b pb-2 mb-2">
              <div className="flex-1">
                <p className="text-sm">{notif.message}</p>
                <small className="text-xs text-gray-400">
                  {new Date(notif.created_at).toLocaleString()}
                </small>
              </div>

              <button
                onClick={() => markNotificationAsRead(notif.id)}
                className="text-blue-600 hover:underline text-xs ml-2"
              >
                Mark read
              </button>
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );

}
