import { Atom } from "lucide-react";

export default function RootLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
          display: "grid",
          placeItems: "center",
          animation: "pulse-subtle 2s ease-in-out infinite",
        }}
      >
        <Atom size={24} style={{ color: "white" }} />
      </div>
      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
        Loading MatPilot…
      </span>
    </div>
  );
}
