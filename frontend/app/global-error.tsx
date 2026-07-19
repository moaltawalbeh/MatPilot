"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div style={{ textAlign: "center", padding: 40, maxWidth: 480 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#525252",
              letterSpacing: "-2px",
              marginBottom: 8,
            }}
          >
            500
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 12,
              color: "#f5f5f5",
            }}
          >
            Application Error
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#a3a3a3",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            A critical error prevented the application from loading. Please
            refresh the page or try again later.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "1px solid #404040",
              background: "#262626",
              color: "#f5f5f5",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
