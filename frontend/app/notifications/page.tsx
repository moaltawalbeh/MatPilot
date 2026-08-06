"use client";

import { Page } from "@/components/ui/page";
import { apiService } from "@/lib/api-client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Info, AlertCircle, CheckCircle2, FlaskConical, Inbox, Loader2 } from "lucide-react";

type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  user_id: string;
  read: boolean;
  created_at: string;
};

const typeIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  info: Info,
  warning: AlertCircle,
  success: CheckCircle2,
  experiment: FlaskConical,
};

const typeColors: Record<string, string> = {
  info: "var(--accent-cyan)",
  warning: "var(--warning)",
  success: "var(--success)",
  experiment: "var(--accent-orange)",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.listNotifications();
      const raw = (data?.notifications ?? []) as any[];
      setNotifications(
        raw.map((n) => ({
          id: String(n.id),
          title: n.title ?? "Notification",
          message: n.message ?? "",
          type: ["info", "warning", "success", "experiment"].includes(n.type)
            ? n.type
            : "info",
          read: Boolean(n.read ?? n.is_read),
          user_id: n.user_id ?? "",
          created_at: n.created_at ?? "",
        })),
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiService.markNotificationRead(id);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiService.markAllNotificationsRead();
    } catch {}
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Page
      eyebrow="Account"
      title="Notifications"
      description="Updates on your analyses, exports, and platform activity."
      actions={
        unreadCount > 0 ? (
          <button className="button" onClick={markAllRead} style={{ fontSize: 13 }}>
            <CheckCheck size={14} /> Mark all read
          </button>
        ) : undefined
      }
    >
      <section className="card">
        <div className="section">
          <div>
            <h2>Activity</h2>
            <span className="muted">{unreadCount} unread · {notifications.length} total</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 24px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-tertiary)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Inbox size={24} style={{ color: "var(--text-muted)" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              No notifications yet
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
              You&apos;ll see updates here when analyses complete, exports are ready, or the platform has news for you.
            </p>
            <Link href="/projects" className="button" style={{ marginTop: 20, textDecoration: "none", fontSize: 13 }}>
              <FlaskConical size={14} /> Go to projects
            </Link>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] ?? Info;
              const color = typeColors[n.type] ?? "var(--text-muted)";
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: "flex",
                    gap: 12,
                    width: "100%",
                    padding: "14px 20px",
                    border: "none",
                    borderTop: "1px solid var(--border-subtle)",
                    background: n.read ? "transparent" : "var(--accent-orange-bg)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-sm)",
                      background: n.read ? "transparent" : `${color}15`,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      color,
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 600, color: "var(--text-primary)" }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      )}
                    </div>
                    {n.message && (
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 2 }}>
                        {n.message}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      <Bell size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </Page>
  );
}
