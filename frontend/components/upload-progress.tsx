"use client";

import { X, Check, AlertTriangle, Loader2 } from "lucide-react";

type UploadProgressProps = {
  fileName: string;
  fileSize?: number;
  progress: number;
  status: "uploading" | "processing" | "complete" | "error";
  error?: string;
  onCancel?: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig = {
  uploading: { label: "Uploading...", color: "var(--accent-orange)", icon: null },
  processing: { label: "Processing...", color: "var(--accent-cyan)", icon: null },
  complete: { label: "Complete", color: "var(--accent-emerald)", icon: Check },
  error: { label: "Failed", color: "var(--error)", icon: AlertTriangle },
} as const;

export function UploadProgress({ fileName, fileSize, progress, status, error, onCancel }: UploadProgressProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
            {fileSize !== undefined && <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{formatFileSize(fileSize)}</span>}
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "var(--surface-3)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: status === "complete" ? "var(--accent-emerald)" : status === "error" ? "var(--error)" : "var(--accent-orange)", width: `${status === "complete" ? 100 : clampedProgress}%`, transition: "width 0.4s var(--ease-out)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: config.color }}>
              {(status === "uploading" || status === "processing") && <Loader2 size={12} className="spin" style={{ display: "inline" }} />}
              {StatusIcon && <StatusIcon size={12} style={{ display: "inline" }} />}
              {config.label}
              {error && status === "error" && <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>{error}</span>}
            </span>
            {(status === "uploading" || status === "processing") && <span style={{ fontSize: 12, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{Math.round(clampedProgress)}%</span>}
          </div>
        </div>
        {onCancel && (status === "uploading" || status === "processing") && (
          <button onClick={onCancel} style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-2)", color: "var(--text-tertiary)", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--error)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; }}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
