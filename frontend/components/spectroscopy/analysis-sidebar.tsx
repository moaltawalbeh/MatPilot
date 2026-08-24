"use client";

import { SlidersHorizontal, Play } from "lucide-react";
import { ButtonSpinner } from "../ui/loading";

type AnalysisSidebarProps = {
  smoothingWindow: number;
  onSmoothingWindow: (v: number) => void;
  baselineMethod: string;
  onBaselineMethod: (v: string) => void;
  prominence: number;
  onProminence: (v: number) => void;
  defaultProminence: number;
  onRun: () => void;
  running: boolean;
  isAnalyzed: boolean;
};

export function AnalysisSidebar({
  smoothingWindow,
  onSmoothingWindow,
  baselineMethod,
  onBaselineMethod,
  prominence,
  onProminence,
  defaultProminence,
  onRun,
  running,
  isAnalyzed,
}: AnalysisSidebarProps) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SlidersHorizontal size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>Analysis</h2>
          <span className="muted">Tune peak detection parameters</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            <span>Smoothing window</span>
            <span style={{ color: "var(--accent-orange)", fontVariantNumeric: "tabular-nums" }}>{smoothingWindow} pts</span>
          </span>
          <input
            type="range"
            min={3}
            max={25}
            value={smoothingWindow}
            onChange={(e) => onSmoothingWindow(Number(e.target.value))}
            style={{ accentColor: "var(--accent-orange)" }}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Moving-average smoothing (odd numbers round down).</span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Baseline correction</span>
          <select
            value={baselineMethod}
            onChange={(e) => onBaselineMethod(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          >
            <option value="none">None (raw data)</option>
            <option value="polynomial">Polynomial fit (2nd order)</option>
            <option value="linear">Linear detrend</option>
          </select>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Removes baseline drift before peak detection.</span>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            <span>Peak prominence</span>
            <span style={{ color: "var(--accent-orange)", fontVariantNumeric: "tabular-nums" }}>{prominence.toFixed(2)}%</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.05}
            value={prominence}
            onChange={(e) => onProminence(Number(e.target.value))}
            style={{ accentColor: "var(--accent-orange)" }}
          />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Percentage of the intensity span (default {defaultProminence}%). Higher = fewer, stronger peaks.
          </span>
        </label>

        <button className="button primary" onClick={onRun} disabled={running} style={{ width: "100%" }}>
          {running ? <ButtonSpinner /> : <Play size={14} />}
          {running ? "Analyzing…" : isAnalyzed ? "Re-analyze" : "Run analysis"}
        </button>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: -6 }}>
          Analysis runs server-side with baseline correction, smoothing, peak detection (scipy) and band assignment.
        </p>
      </div>
    </div>
  );
}
