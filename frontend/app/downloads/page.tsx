"use client";

import { Page } from "@/components/ui/page";
import { useDownloads } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = ["", "READY", "PENDING", "FAILED"];

function statusColor(status: string) {
  switch (status) {
    case "READY": return "good";
    case "PENDING": return "warning";
    case "FAILED": return "error";
    default: return "";
  }
}

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function DownloadsPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useDownloads({ status: status || undefined });

  const downloads: any[] = data?.downloads ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Enterprise"
      title="Downloads"
      description="Access exported reports, processed data, and generated files."
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Type</th>
              <th>Status</th>
              <th>Size</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : downloads.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>⬇️</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No downloads yet</p>
                  <p style={{ fontSize: 13 }}>Exported files and reports will appear here.</p>
                </td>
              </tr>
            ) : (
              downloads.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                        {d.filename?.split(".").pop()?.toUpperCase() || "FILE"}
                      </div>
                      <strong>{d.filename}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ fontSize: 10 }}>
                      {d.file_type || d.type || "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${statusColor(d.status)}`} style={{ fontSize: 10 }}>
                      {d.status || "—"}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatBytes(d.file_size ?? d.size)}</td>
                  <td style={{ color: "var(--text-tertiary)" }}>{d.created_at?.slice(0, 10) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
