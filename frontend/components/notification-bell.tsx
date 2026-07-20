"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ChevronRight, Info, AlertCircle, CheckCircle2, FlaskConical } from "lucide-react";

type Notification = {
  id: string;
  type: "info" | "warning" | "success" | "experiment";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const defaultNotifications: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Rietveld refinement complete",
    message: "Sample #42 refinement converged with Rwp = 4.2%",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Low memory warning",
    message: "Server memory usage is at 85%",
    time: "15m ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "New update available",
    message: "MatPilot v2.3.0 is ready to install",
    time: "1h ago",
    read: false,
  },
  {
    id: "4",
    type: "experiment",
    title: "Experiment completed",
    message: "Phase identification finished for batch #7",
    time: "3h ago",
    read: true,
  },
  {
    id: "5",
    type: "info",
    title: "Data export ready",
    message: "Your XRD dataset export is available for download",
    time: "5h ago",
    read: true,
  },
];

const typeIcons: Record<Notification["type"], React.ComponentType<{ size?: number }>> = {
  info: Info,
  warning: AlertCircle,
  success: CheckCircle2,
  experiment: FlaskConical,
};

const typeColors: Record<Notification["type"], string> = {
  info: "var(--accent-cyan)",
  warning: "var(--warning)",
  success: "var(--success)",
  experiment: "var(--accent-orange)",
};

type NotificationBellProps = {
  count?: number;
};

export function NotificationBell({ count = 0 }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(defaultNotifications);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true })),
    );
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          display: "grid",
          placeItems: "center",
          width: 32,
          height: 32,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "var(--error)",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              lineHeight: 1,
              boxShadow: "0 0 0 2px var(--surface-1)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            width: 360,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 100,
            overflow: "hidden",
            animation: "fade-in-scale 0.15s var(--ease-out)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--accent-orange)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {notifications.length === 0 && (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  fontSize: 13,
                }}
              >
                No notifications yet
              </div>
            )}
            {notifications.map((n) => {
              const Icon = typeIcons[n.type];
              const color = typeColors[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    display: "flex",
                    gap: 10,
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: n.read ? "transparent" : "var(--accent-orange-bg)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-sm)",
                      background: n.read ? "transparent" : `${color}15`,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color,
                    }}
                  >
                    <Icon size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: n.read ? 500 : 600,
                        color: "var(--text-primary)",
                        marginBottom: 2,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-tertiary)",
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {n.time}
                    </div>
                  </div>
                  {!n.read && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <Link
            href="/notifications"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 16px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              transition: "color 0.1s",
            }}
          >
            View all
            <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
