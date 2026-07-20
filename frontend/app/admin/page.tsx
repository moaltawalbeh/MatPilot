"use client";

import { Page } from "@/components/ui/page";
import { useUsers } from "@/hooks/use-api";
import { Loader2, Shield } from "lucide-react";
import { useState } from "react";

const ROLE_OPTIONS = ["", "admin", "scientist", "viewer"];

function roleColor(role: string) {
  switch (role) {
    case "admin": return "error";
    case "scientist": return "info";
    case "viewer": return "";
    default: return "";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "active": return "good";
    case "inactive": return "";
    case "suspended": return "error";
    default: return "";
  }
}

export default function AdminPage() {
  const [role, setRole] = useState("");
  const { data, isLoading } = useUsers({ role: role || undefined });

  const users: any[] = data?.users ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Administration"
      title="User Management"
      description="Manage user accounts, roles, and access permissions."
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.filter(Boolean).map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>👤</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No users found</p>
                  <p style={{ fontSize: 13 }}>Invite team members to collaborate on analyses.</p>
                </td>
              </tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: u.role === "admin" ? "var(--error-bg, rgba(239,68,68,0.1))" : "var(--accent-orange-bg)",
                        display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
                        color: u.role === "admin" ? "var(--error)" : "var(--accent-orange)",
                        flexShrink: 0,
                      }}>
                        {u.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <strong>{u.name || "—"}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{u.email || "—"}</td>
                  <td>
                    <span className={`badge ${roleColor(u.role)}`} style={{ fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {u.role === "admin" && <Shield size={10} />}
                      {(u.role || "viewer").charAt(0).toUpperCase() + (u.role || "viewer").slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusColor(u.status || "active")}`} style={{ fontSize: 10 }}>
                      {(u.status || "active").charAt(0).toUpperCase() + (u.status || "active").slice(1)}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-tertiary)" }}>{u.last_login?.slice(0, 16).replace("T", " ") || "Never"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
