"use client";

import { Page } from "@/components/ui/page";
import Link from "next/link";
import {
  FileBarChart,
  Waves,
  AudioLines,
  Sun,
  ChevronRight,
} from "lucide-react";

const modules = [
  {
    name: "X-ray Diffraction (XRD)",
    icon: FileBarChart,
    description: "Crystal structure analysis, phase identification, and Rietveld refinement",
    href: "/experiments",
    accentColor: "var(--accent-orange)",
    bgColor: "var(--accent-orange-bg)",
  },
  {
    name: "Raman Spectroscopy",
    icon: Waves,
    description: "Molecular vibration analysis for non-destructive material identification",
    href: "/characterization/raman",
    accentColor: "var(--accent-blue)",
    bgColor: "var(--accent-blue-bg)",
  },
  {
    name: "FTIR Spectroscopy",
    icon: AudioLines,
    description: "Infrared absorption for functional group and chemical bond identification",
    href: "/characterization/ftir",
    accentColor: "var(--accent-purple)",
    bgColor: "var(--accent-purple-bg)",
  },
  {
    name: "UV-Vis Spectroscopy",
    icon: Sun,
    description: "Electronic transitions, Tauc plot band gap (E_g), and optical property determination",
    href: "/characterization/uvvis",
    accentColor: "var(--accent-orange)",
    bgColor: "var(--accent-orange-bg)",
  },
];

export default function CharacterizationPage() {
  return (
    <Page
      eyebrow="Materials Analysis"
      title="Characterization Modules"
      description="Access integrated analytical techniques for comprehensive materials characterization"
    >
      <section className="card">
        <div className="section">
          <div>
            <h2>Available Techniques</h2>
            <span className="muted">{modules.length} available</span>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
            padding: "4px 20px 20px",
          }}
        >
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.name}
                href={mod.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.12s ease, box-shadow 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "var(--radius-sm)",
                    background: mod.bgColor,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} style={{ color: mod.accentColor }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{mod.name}</span>
                    <span
                      className="badge good"
                      style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}
                    >
                      Available
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mod.description}
                  </div>
                </div>
                <ChevronRight size={14} color="var(--text-muted)" />
              </Link>
            );
          })}
        </div>
      </section>
    </Page>
  );
}
