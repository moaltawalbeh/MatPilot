"use client";

import { AlertTriangle } from "lucide-react";

type ErrorDisplayProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export function ErrorDisplay({
  title = "Something went wrong",
  message,
  onRetry,
  onDismiss,
}: ErrorDisplayProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 40,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        maxWidth: 480,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: "rgba(239, 68, 68, 0.1)",
          display: "grid",
          placeItems: "center",
          marginBottom: 16,
        }}
      >
        <AlertTriangle size={24} style={{ color: "var(--error)" }} />
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: (onRetry || onDismiss) ? 24 : 0,
        }}
      >
        {message}
      </p>
      {(onRetry || onDismiss) && (
        <div style={{ display: "flex", gap: 10 }}>
          {onRetry && (
            <button className="button primary" onClick={onRetry}>
              Try again
            </button>
          )}
          {onDismiss && (
            <button className="button ghost" onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
