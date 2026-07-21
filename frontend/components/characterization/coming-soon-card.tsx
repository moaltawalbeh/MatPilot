"use client";

import { LucideIcon } from "lucide-react";

type ComingSoonCardProps = {
  icon: LucideIcon;
  name: string;
  description: string;
  features: string[];
  accentColor?: string;
};

export function ComingSoonCard({
  icon: Icon,
  name,
  description,
  features,
  accentColor = "var(--accent-orange)",
}: ComingSoonCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "24px 28px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-elevated)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-md)",
            background: "var(--accent-orange-bg)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={26} style={{ color: accentColor }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>{name}</h3>
            <span
              className="badge warning"
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Coming Soon
            </span>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
      </div>

      <section className="card">
        <div className="section">
          <div>
            <h2>Expected Features</h2>
            <span className="muted">Planned capabilities for this module</span>
          </div>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: idx < features.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: accentColor,
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="card"
        style={{
          background: "var(--surface-elevated)",
          border: "1px dashed var(--border-strong)",
        }}
      >
        <div style={{ padding: "28px 24px", textAlign: "center" }}>
          <Icon size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.35 }} />
          <p className="muted" style={{ fontSize: 13, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            This characterization module is under active development. It will integrate seamlessly
            with the MatPilot platform to provide a complete materials characterization workflow.
          </p>
        </div>
      </section>
    </div>
  );
}
