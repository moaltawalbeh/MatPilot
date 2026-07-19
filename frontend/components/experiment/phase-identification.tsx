"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Info } from "lucide-react";
import { usePhaseIdentification } from "@/hooks/use-api";
import type { CandidatePhase, CIFFile } from "@/types";

type PhaseIdentificationProps = {
  experimentId: string;
  candidatePhases: CandidatePhase[];
  cifFiles: CIFFile[];
  onComplete: () => void;
};

export function PhaseIdentification({ experimentId, candidatePhases, cifFiles, onComplete }: PhaseIdentificationProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const phaseIdMutation = usePhaseIdentification();
  const isRunning = phaseIdMutation.isPending;
  const hasResults = candidatePhases.length > 0;

  const handleRun = async () => {
    try {
      await phaseIdMutation.mutateAsync({ experimentId, data: { query, limit: 20 } });
      onComplete();
    } catch {}
  };

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "12px 16px",
          background: "var(--surface-2)",
          border: "none",
          color: "var(--text-primary)",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.12s ease",
        }}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center" }}>
          <Search size={14} style={{ color: "var(--accent-orange)" }} />
        </div>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Phase Identification</span>
        {hasResults && (
          <span className="badge good" style={{ marginLeft: "auto", fontSize: 10 }}>
            {candidatePhases.length} candidates
          </span>
        )}
      </button>

      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !isRunning) handleRun(); }}
              placeholder="Search formula (e.g. Si, LaB6, SiO2) or leave empty\u2026"
              style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
            />
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="button primary"
              style={{ minWidth: 130, justifyContent: "center" }}
            >
              {isRunning ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
              {isRunning ? "Searching\u2026" : "Identify Phases"}
            </button>
          </div>

          {isRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13 }}>
              <Loader2 size={16} className="spin" />
              <div>
                <div style={{ fontWeight: 500 }}>Searching crystallographic databases\u2026</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Querying COD API, downloading CIF files, computing theoretical patterns</div>
              </div>
            </div>
          )}

          {phaseIdMutation.isError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--error-bg)", color: "var(--error)", fontSize: 13 }}>
              <AlertCircle size={14} />
              <span>{phaseIdMutation.error?.message || "Phase identification failed"}</span>
            </div>
          )}

          {hasResults && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Candidate Phases ({candidatePhases.length})
              </div>
              <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Material</th>
                      <th>Formula</th>
                      <th>Match</th>
                      <th>Confidence</th>
                      <th>Peaks</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatePhases.map((phase) => (
                      <tr key={phase.rank}>
                        <td>{phase.rank}</td>
                        <td><strong>{phase.material_name || "Unknown"}</strong></td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{phase.material_formula || "\u2014"}</td>
                        <td>{((phase.match_score ?? 0) * 100).toFixed(1)}%</td>
                        <td>
                          <span className={`badge ${phase.confidence === "High" ? "good" : phase.confidence === "Medium" ? "warn" : ""}`}>
                            {phase.confidence || "N/A"}
                          </span>
                        </td>
                        <td>{phase.matched_peaks ?? 0}/{phase.total_experimental_peaks ?? 0}</td>
                        <td><span className="badge info">{phase.source_provider || "\u2014"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!hasResults && !isRunning && !phaseIdMutation.isError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--surface-2)", color: "var(--text-tertiary)", fontSize: 13 }}>
              <Info size={14} />
              <span>Enter a formula or leave empty for auto-detection from the Crystallography Open Database</span>
            </div>
          )}

          {cifFiles.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Downloaded CIF Files ({cifFiles.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {cifFiles.map((cif) => (
                  <div
                    key={cif.cod_id}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--surface-2)",
                      fontSize: 11,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{cif.material_name || cif.cod_id}</span>
                    <span style={{ color: "var(--accent-orange)", fontFamily: "var(--font-mono)" }}>{cif.material_formula}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
