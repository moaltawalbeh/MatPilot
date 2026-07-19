"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MatPilot] Page error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: "var(--text-muted)",
          letterSpacing: "-2px",
          marginBottom: 8,
        }}
      >
        Error
      </div>
      <h1
        style={{
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          marginBottom: 24,
          maxWidth: 400,
        }}
      >
        An unexpected error occurred while rendering this page. Please try
        again.
      </p>
      <button
        onClick={reset}
        className="button primary"
        style={{ cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
