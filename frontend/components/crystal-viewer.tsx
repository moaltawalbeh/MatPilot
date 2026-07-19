"use client";
import { Box } from "lucide-react";

type CrystalViewerProps = {
  hasData?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function CrystalViewer({ hasData = false, emptyTitle, emptyDescription, emptyAction }: CrystalViewerProps) {
  if (!hasData) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        minHeight: 250,
        background: "var(--bg-elevated)",
        borderRadius: 8,
        border: "1px solid var(--border-subtle)",
      }}>
        <Box size={48} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {emptyTitle || "No crystal structure data"}
        </h3>
        <p className="muted" style={{ fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 16 }}>
          {emptyDescription || "Upload a CIF file to visualize the 3D crystal structure here."}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      minHeight: 250,
      background: "var(--bg-elevated)",
      borderRadius: 8,
      border: "1px solid var(--border-subtle)",
    }}>
      <Box size={48} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        Crystal structure loaded
      </h3>
      <p className="muted" style={{ fontSize: 13, textAlign: "center", maxWidth: 300 }}>
        3D visualization will be available once the CIF data is processed.
      </p>
    </div>
  );
}
