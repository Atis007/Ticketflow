import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllRead,
  useDeleteNotification,
} from "./hooks/useNotifications";

function relativeTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notificationBody(type, data) {
  if (type === "purchase_success") {
    const count = data.ticket_count ?? 1;
    return `${count} ticket${count !== 1 ? "s" : ""} — tap to view your profile`;
  }
  if (type === "event_updated") {
    return "Tap to view the event";
  }
  return "";
}

function notificationIcon(type) {
  if (type === "purchase_success") return "check_circle";
  return "info";
}

function notificationUrl(type, data) {
  if (type === "purchase_success") return "/profile";
  if (type === "event_updated" && data.category_slug && data.event_slug) {
    return `/events/${data.category_slug}/${data.event_slug}`;
  }
  return null;
}

export default function NotificationDropdown({ onClose }) {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const deleteNotif = useDeleteNotification();
  const navigate = useNavigate();
  const ref = useRef(null);

  const notifications = (data?.notifications ?? []).slice(0, 20);

  useEffect(() => {
    function handleMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  function handleItemClick(notif) {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    const url = notificationUrl(notif.type, notif.data);
    if (url) {
      navigate(url);
    }
    onClose();
  }

  function handleMarkAll(e) {
    e.stopPropagation();
    markAll.mutate();
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteNotif.mutate(id);
  }

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 rounded-xl border border-white/10 bg-background-dark shadow-2xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white">Notifications</span>
        <button
          onClick={handleMarkAll}
          className="text-xs text-gray-400 hover:text-primary transition-colors cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <ul className="max-h-96 overflow-y-auto divide-y divide-white/5">
        {notifications.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            No notifications yet.
          </li>
        ) : (
          notifications.map((notif) => {
            const body = notificationBody(notif.type, notif.data);
            return (
              <li
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 ${
                  !notif.is_read ? "bg-white/[0.03]" : ""
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl mt-0.5 flex-shrink-0 ${
                    notif.type === "purchase_success"
                      ? "text-green-400"
                      : "text-blue-400"
                  }`}
                >
                  {notificationIcon(notif.type)}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white leading-tight">
                    {notif.title}
                  </p>
                  {body && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {body}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    {relativeTime(notif.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                    aria-label="Delete notification"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
