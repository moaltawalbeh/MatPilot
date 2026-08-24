"use client";

import { History, Trash2 } from "lucide-react";
import type { SpectrumHistoryEntry } from "../../types";

type HistoryTimelineProps = {
  history: SpectrumHistoryEntry[];
  onDelete?: () => void;
  deleting?: boolean;
};

function detailsText(details?: Record<string, unknown>): string | null {
  if (!details) return null;
  const parts = Object.entries(details)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  return parts.length ? parts.join(" · ") : null;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Uploaded spectrum",
  analyzed: "Analysis completed",
  reanalyzed: "Analysis updated",
  report_generated: "Report generated",
  deleted: "Spectrum deleted",
};

export function HistoryTimeline({ history, onDelete, deleting }: HistoryTimelineProps) {
  const sorted = [...(history ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <History size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>History</h2>
          <span className="muted">Analysis timeline</span>
        </div>
        {onDelete && (
          <button
            className="button ghost danger"
            onClick={onDelete}
            disabled={deleting}
            style={{ marginLeft: "auto", fontSize: 12, padding: "6px 10px" }}
            title="Delete spectrum"
          >
            <Trash2 size={13} />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column" }}>
        {(!sorted || sorted.length === 0) ? (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            No events yet. Run an analysis to record history.
          </p>
        ) : (
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: "var(--border-subtle)", borderRadius: 2 }} />
            {sorted.map((entry) => {
              const action = ACTION_LABELS[entry.action] ?? entry.action;
              const isAnalyzed = entry.action === "analyzed" || entry.action === "reanalyzed";
              return (
                <div key={`${entry.action}-${entry.timestamp}`} style={{ position: "relative", padding: "10px 0 10px 24px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 14,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: isAnalyzed ? "var(--accent-orange)" : "var(--surface-2)",
                      border: "2px solid var(--surface-elevated)",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{action}</span>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{relativeTime(entry.timestamp)}</span>
                  </div>
                  {detailsText(entry.details) && (
                    <p style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
                      {detailsText(entry.details)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
