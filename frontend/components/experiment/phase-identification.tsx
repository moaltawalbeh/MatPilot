"use client";

import { useState, useCallback } from "react";
import { Search, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Info, Check } from "lucide-react";
import { usePhaseIdentification } from "@/hooks/use-api";
import type { CandidatePhase, CIFFile } from "@/types";

export const PHASE_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#eab308",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export function getPhaseColor(index: number): string {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

type PhaseIdentificationProps = {
  experimentId: string;
  candidatePhases: CandidatePhase[];
  cifFiles: CIFFile[];
  onComplete: () => void;
  selectedPhaseIndices?: Set<number>;
  onSelectionChange?: (indices: Set<number>) => void;
  onContinue?: () => void;
  phaseColors?: Map<number, string>;
};

export function PhaseIdentification({
  experimentId,
  candidatePhases,
  cifFiles,
  onComplete,
  selectedPhaseIndices,
  onSelectionChange,
  onContinue,
  phaseColors,
}: PhaseIdentificationProps) {
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

  const togglePhase = useCallback(
    (rank: number) => {
      if (!selectedPhaseIndices || !onSelectionChange) return;
      const next = new Set(selectedPhaseIndices);
      if (next.has(rank)) {
        next.delete(rank);
      } else {
        next.add(rank);
      }
      onSelectionChange(next);
    },
    [selectedPhaseIndices, onSelectionChange],
  );

  const selectAll = useCallback(() => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set(candidatePhases.map((p) => p.rank)));
  }, [candidatePhases, onSelectionChange]);

  const deselectAll = useCallback(() => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set());
  }, [onSelectionChange]);

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
        {hasResults && selectedPhaseIndices && selectedPhaseIndices.size > 0 && (
          <span style={{ fontSize: 10, color: "var(--accent-orange)", fontWeight: 600, marginLeft: 4 }}>
            {selectedPhaseIndices.size} selected
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Candidate Phases ({candidatePhases.length})
                </div>
                {selectedPhaseIndices && onSelectionChange && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={selectAll} className="button ghost sm" style={{ height: 22, fontSize: 10, padding: "0 8px" }}>Select all</button>
                    <button onClick={deselectAll} className="button ghost sm" style={{ height: 22, fontSize: 10, padding: "0 8px" }}>Clear</button>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {candidatePhases.map((phase, idx) => {
                  const isSelected = selectedPhaseIndices?.has(phase.rank) ?? false;
                  const color = phaseColors?.get(phase.rank) ?? getPhaseColor(idx);
                  return (
                    <div
                      key={phase.rank}
                      onClick={() => togglePhase(phase.rank)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${isSelected ? color : "var(--border-subtle)"}`,
                        background: isSelected ? `${color}12` : "transparent",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `2px solid ${isSelected ? color : "var(--text-muted)"}`,
                          background: isSelected ? color : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.12s ease",
                        }}
                      >
                        {isSelected && <Check size={11} style={{ color: "white", strokeWidth: 3 }} />}
                      </div>

                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {phase.material_name || "Unknown"}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                          {phase.material_formula || "\u2014"}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-muted)" }}>
                          {((phase.match_score ?? 0) * 100).toFixed(1)}%
                        </span>
                        <span className={`badge ${phase.confidence === "High" ? "good" : phase.confidence === "Medium" ? "warn" : ""}`} style={{ fontSize: 9 }}>
                          {phase.confidence || "N/A"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedPhaseIndices && onSelectionChange && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={onContinue}
                    disabled={selectedPhaseIndices.size === 0}
                    className="button primary"
                    style={{ width: "100%", justifyContent: "center", height: 36, fontSize: 13, fontWeight: 600 }}
                  >
                    <Check size={14} />
                    Continue to Refinement ({selectedPhaseIndices.size} phase{selectedPhaseIndices.size !== 1 ? "s" : ""})
                  </button>
                </div>
              )}
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
