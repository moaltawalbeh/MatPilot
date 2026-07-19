"use client";

import { Page } from "@/components/ui/page";
import { Save, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type SettingsSection = {
  title: string;
  description: string;
  fields: { label: string; type: string; value: string | number; options?: string[] }[];
};

const defaultSections: SettingsSection[] = [
  {
    title: "Instrument Configuration",
    description: "Default X-ray source and instrument parameters",
    fields: [
      { label: "Radiation", type: "select", value: "Cu Kα", options: ["Cu Kα", "Mo Kα", "Co Kα", "Cr Kα"] },
      { label: "Wavelength (Å)", type: "number", value: 1.5406 },
      { label: "Instrument", type: "text", value: "Bruker D8 Advance" },
    ],
  },
  {
    title: "Background Correction",
    description: "Iterative polynomial background subtraction",
    fields: [
      { label: "Polynomial Order", type: "number", value: 6 },
      { label: "Max Iterations", type: "number", value: 50 },
      { label: "Convergence Threshold", type: "number", value: 0.01 },
    ],
  },
  {
    title: "Kα2 Stripping",
    description: "Rachinger deconvolution for Kα2 removal",
    fields: [
      { label: "Kα2/Kα1 Ratio", type: "number", value: 0.5 },
      { label: "Enabled", type: "select", value: "Yes", options: ["Yes", "No"] },
    ],
  },
  {
    title: "Noise Reduction",
    description: "Savitzky-Golay smoothing filter",
    fields: [
      { label: "Window Size", type: "number", value: 11 },
      { label: "Polynomial Order", type: "number", value: 3 },
      { label: "Enabled", type: "select", value: "Yes", options: ["Yes", "No"] },
    ],
  },
  {
    title: "Rietveld Refinement",
    description: "Default refinement parameters",
    fields: [
      { label: "Profile Function", type: "select", value: "Pseudo-Voigt", options: ["Pseudo-Voigt", "Pearson VII", "Voigt"] },
      { label: "Max Iterations", type: "number", value: 100 },
      { label: "Convergence Criteria", type: "number", value: 0.001 },
      { label: "Background Polynomial", type: "number", value: 4 },
    ],
  },
];

const STORAGE_KEY = "matpilot-settings";

function loadSettings(): SettingsSection[] {
  if (typeof window === "undefined") return defaultSections;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSections;
    return JSON.parse(raw) as SettingsSection[];
  } catch {
    return defaultSections;
  }
}

export default function SettingsPage() {
  const [sections, setSections] = useState<SettingsSection[]>(loadSettings);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const updateField = (sectionIdx: number, fieldIdx: number, value: string) => {
    setSections((prev) => {
      const next = structuredClone(prev);
      next[sectionIdx].fields[fieldIdx].value = value;
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSections(defaultSections);
  };

  return (
    <Page
      eyebrow="Configuration"
      title="Settings"
      description="Manage laboratory defaults and analysis workflow parameters. These settings are stored locally in your browser and applied to future pipeline runs."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button className="button primary" onClick={handleSave}>
            <Save size={14} />
            {saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sections.map((section, sectionIdx) => (
          <section className="card" key={section.title}>
            <div className="section">
              <div>
                <h2>{section.title}</h2>
                <span className="muted">{section.description}</span>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
                {section.fields.map((field, fieldIdx) => (
                  <div key={field.label}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 550, color: "var(--text-secondary)", marginBottom: 6 }}>{field.label}</label>
                    {field.type === "select" ? (
                      <select defaultValue={field.value as string} onChange={(e) => updateField(sectionIdx, fieldIdx, e.target.value)}>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} defaultValue={field.value} onChange={(e) => updateField(sectionIdx, fieldIdx, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </Page>
  );
}
