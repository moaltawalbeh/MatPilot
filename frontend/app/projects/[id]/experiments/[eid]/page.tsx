"use client";

import { useState, useMemo, useCallback, use, useEffect } from "react";
import {
  Layers, Zap, Activity, BarChart2, Search, Database, CheckSquare,
  Target, Play, Check, X, Loader2, Clock, AlertTriangle, FlaskConical,
  ChevronRight, ChevronLeft, ArrowLeft, Box, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, TableProperties, Atom,
} from "lucide-react";
import { useExperiment, useRunPipeline, useExperimentData } from "@/hooks/use-api";
import { XrdChart } from "@/components/charts/xrd-chart";
import { PhaseIdentification } from "@/components/experiment/phase-identification";
import { RietveldRefinement } from "@/components/experiment/rietveld-refinement";
import type { PipelineStage, Peak } from "@/types";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

const STAGE_ICONS: Record<string, typeof Layers> = {
  background_correction: Layers, ka2_stripping: Zap, noise_reduction: Activity,
  intensity_normalization: BarChart2, peak_detection: Search,
  phase_identification: Database, candidate_selection: CheckSquare, rietveld_refinement: Target,
};

const PIPELINE_STAGES = [
  { id: "background_correction", name: "Background Correction", desc: "Subtract diffraction background" },
  { id: "ka2_stripping", name: "K\u03b12 Stripping", desc: "Remove K\u03b12 contribution" },
  { id: "noise_reduction", name: "Noise Reduction", desc: "Smooth noise, preserve peaks" },
  { id: "intensity_normalization", name: "Normalization", desc: "Normalize intensities" },
  { id: "peak_detection", name: "Peak Detection", desc: "Identify diffraction peaks" },
  { id: "phase_identification", name: "Phase Identification", desc: "Search for matching phases" },
  { id: "candidate_selection", name: "Candidate Selection", desc: "Select phases for refinement" },
  { id: "rietveld_refinement", name: "Rietveld Refinement", desc: "Least-squares refinement" },
];

export default function ExperimentWorkspacePage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const resolvedParams = use(params);
  const { id: projectId, eid: experimentId } = resolvedParams;
  const { data: experiment, isLoading } = useExperiment(experimentId);
  const { data: rawData } = useExperimentData(projectId, experimentId);
  const runPipeline = useRunPipeline();
  const [autoRan, setAutoRan] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showPeaks, setShowPeaks] = useState(false);

  const shouldAutoRun = useMemo(() => {
    if (!experiment || autoRan) return false;
    return experiment.has_pattern_data && (!experiment.pipeline_stages || experiment.pipeline_stages.length === 0);
  }, [experiment, autoRan]);

  const handleAutoRun = useCallback(() => {
    if (shouldAutoRun && experimentId) {
      setAutoRan(true);
      runPipeline.mutate({ experimentId, data: { stages: ["background_correction", "ka2_stripping", "noise_reduction", "intensity_normalization", "peak_detection"] } });
    }
  }, [shouldAutoRun, experimentId, runPipeline]);

  useEffect(() => {
    if (shouldAutoRun) handleAutoRun();
  }, [shouldAutoRun, handleAutoRun]);

  const stages = experiment?.pipeline_stages || [];
  const completedStages = stages.filter((s: PipelineStage) => s.status === "completed");
  const failedStage = stages.find((s: PipelineStage) => s.status === "failed");
  const isRunning = runPipeline.isPending;

  const chartData = useMemo(() => {
    const rv = experiment?.rietveld_results;
    if (rv?.patterns) {
      const p = rv.patterns;
      return p.two_theta.map((t, i) => ({
        angle: t,
        Experimental: p.observed[i],
        Calculated: p.calculated[i],
        Difference: p.difference[i],
        Background: p.background[i],
      }));
    }
    const expTT = experiment?.raw_two_theta;
    const expInt = experiment?.raw_intensity;
    if (expTT && expInt && expTT.length > 0) {
      return expTT.map((t, i) => ({ angle: t, Experimental: expInt[i] }));
    }
    if (rawData?.two_theta && rawData?.intensity && rawData.two_theta.length > 0) {
      return rawData.two_theta.map((t, i) => ({ angle: t, Experimental: rawData.intensity[i] }));
    }
    return [];
  }, [experiment, rawData]);

  const braggMarkers = useMemo(() => {
    const markers = experiment?.rietveld_results?.bragg_markers;
    if (!markers || markers.length === 0) return undefined;
    return markers.map((m: any) => ({
      two_theta: m.two_theta,
      intensity: m.intensity,
      hkl: m.hkl || "",
    }));
  }, [experiment]);

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
          <Loader2 size={24} className="spin" style={{ marginRight: 12 }} /> Loading experiment\u2026
        </div>
      </AppShell>
    );
  }

  if (!experiment) {
    return (
      <AppShell>
        <div style={{ padding: 40, textAlign: "center" }}>
          <AlertTriangle size={32} style={{ color: "var(--warning)", marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Experiment not found</div>
          <Link href={`/projects/${projectId}`} className="button" style={{ marginTop: 16, textDecoration: "none" }}>Back to project</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-secondary)", flexShrink: 0 }}>
          <Link href={`/projects/${projectId}`} style={{ color: "var(--text-muted)", display: "flex", padding: 4 }}>
            <ArrowLeft size={16} />
          </Link>
          <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <FlaskConical size={15} style={{ color: "var(--accent-orange)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 650, letterSpacing: "-0.2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{experiment.name || "Untitled Experiment"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {experiment.material && <span style={{ color: "var(--accent-orange)" }}>{experiment.material} · </span>}
              {experiment.data_points.toLocaleString()} pts
              {experiment.two_theta_range ? ` · ${experiment.two_theta_range[0].toFixed(1)}\u00b0\u2013${experiment.two_theta_range[1].toFixed(1)}\u00b0` : ""}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${experiment.status === "Refined" ? "good" : experiment.status === "Analyzed" ? "info" : ""}`}>{experiment.status}</span>
          </div>
        </div>

        {/* ── Pipeline Progress ── */}
        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "6px 20px", background: "var(--bg-secondary)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageResult = stages.find((s: PipelineStage) => s.id === stage.id);
              const status = stageResult?.status || "pending";
              const done = status === "completed";
              const fail = status === "failed";
              const run = status === "running";
              return (
                <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <div title={`${stage.name}: ${stage.desc}${done && stageResult?.duration_seconds != null ? ` (${stageResult.duration_seconds.toFixed(1)}s)` : ""}`} style={{ width: 22, height: 22, borderRadius: "var(--radius-xs)", background: done ? "var(--accent-emerald-bg)" : fail ? "var(--error-bg)" : run ? "var(--accent-cyan-bg)" : "var(--surface-2)", border: `1px solid ${done ? "var(--accent-emerald)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--border-subtle)"}`, display: "grid", placeItems: "center", transition: "all 0.2s", cursor: "default" }}>
                    {done ? <Check size={10} style={{ color: "var(--success)" }} /> : fail ? <X size={10} style={{ color: "var(--error)" }} /> : run ? <Loader2 size={10} className="spin" style={{ color: "var(--accent-cyan)" }} /> : <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--border-default)" }} />}
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && <div style={{ width: 8, height: 1, background: done ? "var(--accent-emerald)" : "var(--border-subtle)" }} />}
                </div>
              );
            })}
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>
              {completedStages.length}/{PIPELINE_STAGES.length}
              {isRunning && <span style={{ color: "var(--accent-cyan)", marginLeft: 6 }}>Processing\u2026</span>}
              {failedStage && <span style={{ color: "var(--error)", marginLeft: 6 }}>Failed</span>}
            </span>
          </div>
        </div>

        {/* ── Main Content: 3-column layout ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* ── Left Panel ── */}
          <div style={{ width: leftOpen ? 280 : 0, transition: "width 0.25s ease", overflow: "hidden", borderRight: leftOpen ? "1px solid var(--border-subtle)" : "none", display: "flex", flexDirection: "column", background: "var(--bg-secondary)", flexShrink: 0 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Pipeline & Phases</span>
              <button onClick={() => setLeftOpen(false)} className="button ghost sm" style={{ height: 22, padding: "0 5px" }} title="Collapse panel">
                <PanelLeftClose size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              {/* Run Pipeline Button */}
              <button
                onClick={() => { if (experimentId) runPipeline.mutate({ experimentId, data: {} }); }}
                disabled={isRunning}
                className="button primary"
                style={{ width: "100%", justifyContent: "center", height: 32, fontSize: 12, fontWeight: 600, marginBottom: 12 }}
              >
                {isRunning ? <><Loader2 size={13} className="spin" /> Processing\u2026</> : <><Play size={13} /> Run Pipeline</>}
              </button>

              {/* Stage List */}
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Stages</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {PIPELINE_STAGES.map((stage) => {
                  const Icon = STAGE_ICONS[stage.id] || ChevronRight;
                  const stageResult = stages.find((s: PipelineStage) => s.id === stage.id);
                  const status = stageResult?.status || "pending";
                  const done = status === "completed";
                  const fail = status === "failed";
                  const run = status === "running";
                  return (
                    <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: "var(--radius-sm)", background: done ? "var(--success-bg)" : fail ? "var(--error-bg)" : "transparent", border: `1px solid ${done ? "rgba(16,185,129,0.12)" : fail ? "rgba(239,68,68,0.12)" : "transparent"}` }}>
                      <div style={{ width: 18, height: 18, borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--success)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--surface-3)", flexShrink: 0 }}>
                        {done ? <Check size={9} style={{ color: "white" }} /> : fail ? <X size={9} style={{ color: "white" }} /> : run ? <Loader2 size={9} className="spin" style={{ color: "white" }} /> : <Icon size={9} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 550, color: done ? "var(--success)" : fail ? "var(--error)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage.name}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
                          {done && stageResult?.duration_seconds != null ? `${stageResult.duration_seconds.toFixed(1)}s` : fail && stageResult?.error ? stageResult.error.substring(0, 30) : stage.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase Identification */}
              {completedStages.some((s: PipelineStage) => s.id === "peak_detection") && (
                <div style={{ marginTop: 14 }}>
                  <PhaseIdentification experimentId={experimentId} candidatePhases={experiment.candidate_phases || []} cifFiles={experiment.cif_files || []} onComplete={() => {}} />
                </div>
              )}

              {/* Detected Peaks */}
              {experiment.detected_peaks && experiment.detected_peaks.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => setShowPeaks(!showPeaks)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <TableProperties size={11} />
                    Peaks ({experiment.detected_peaks.length})
                    <ChevronRight size={10} style={{ transform: showPeaks ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                  {showPeaks && (
                    <div style={{ marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
                      <table style={{ width: "100%", fontSize: 10, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "var(--surface-2)" }}>
                            {["2\u03b8", "Int", "d", "FWHM"].map((h) => (
                              <th key={h} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", fontSize: 9, textTransform: "uppercase" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {experiment.detected_peaks.slice(0, 25).map((peak: Peak, idx: number) => (
                            <tr key={idx} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "3px 6px", fontWeight: 550, fontFamily: "var(--font-mono)", fontSize: 10 }}>{peak.two_theta.toFixed(2)}</td>
                              <td style={{ padding: "3px 6px", color: "var(--text-secondary)" }}>{peak.intensity.toFixed(0)}</td>
                              <td style={{ padding: "3px 6px", color: "var(--text-secondary)" }}>{peak.d_spacing?.toFixed(3) ?? "\u2014"}</td>
                              <td style={{ padding: "3px 6px", color: "var(--text-secondary)" }}>{peak.fwhm?.toFixed(3) ?? "\u2014"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* CIF Files */}
              {(experiment.cif_files?.length ?? 0) > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>CIF Files ({experiment.cif_files.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {experiment.cif_files.map((cif, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)", fontSize: 10 }}>
                        <Box size={10} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cif.material_formula || cif.material_name || cif.cod_id}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: 9 }}>{cif.source_provider}{cif.uploaded ? " (uploaded)" : ""}</div>
                        </div>
                        {Boolean(cif.parsed_data?.unit_cell) && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "var(--accent-emerald-bg)", color: "var(--accent-emerald)", fontWeight: 600 }}>Str</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {(experiment.analysis_history?.length ?? 0) > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>History</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {experiment.analysis_history.slice(-5).reverse().map((entry, idx) => (
                      <div key={idx} style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
                        <Clock size={9} />
                        <span style={{ color: "var(--accent-orange)" }}>{entry.action?.replace(/_/g, " ")}</span>
                        <span style={{ marginLeft: "auto", fontSize: 9 }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Center: Diffraction Chart ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
            {/* Toggle Left Panel */}
            {!leftOpen && (
              <button onClick={() => setLeftOpen(true)} style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 24, height: 48, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} title="Show left panel">
                <PanelLeftOpen size={13} />
              </button>
            )}

            {/* Toggle Right Panel */}
            {!rightOpen && (
              <button onClick={() => setRightOpen(true)} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 24, height: 48, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} title="Show right panel">
                <PanelRightOpen size={13} />
              </button>
            )}

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {chartData.length > 0 ? (
                <XrdChart
                  data={chartData}
                  theoreticalPeaks={braggMarkers}
                  title="Diffraction Pattern"
                  emptyTitle="No pattern data"
                  emptyDescription="Upload an XRD file to begin analysis"
                />
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-1)" }}>
                  <div style={{ textAlign: "center" }}>
                    <FlaskConical size={48} style={{ marginBottom: 12, color: "var(--text-muted)", opacity: 0.3 }} />
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)" }}>No pattern data</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Upload an XRD file to begin analysis</div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Bar (below chart) */}
            {experiment.rietveld_results && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "6px 16px", display: "flex", gap: 16, background: "var(--bg-secondary)", flexShrink: 0 }}>
                {[
                  { label: "R_wp", value: experiment.rietveld_results.r_wp, unit: "%" },
                  { label: "R_p", value: experiment.rietveld_results.r_p, unit: "%" },
                  { label: "R_exp", value: experiment.rietveld_results.r_exp, unit: "%" },
                  { label: "\u03c7\u00b2", value: experiment.rietveld_results.chi_squared },
                  { label: "GoF", value: experiment.rietveld_results.gof },
                ].map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {s.value != null ? s.value.toFixed(2) : "\u2014"}
                      {s.unit && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>{s.unit}</span>}
                    </span>
                  </div>
                ))}
                {experiment.rietveld_results.iterations && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginLeft: "auto" }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Iterations</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{experiment.rietveld_results.iterations}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right Panel ── */}
          <div style={{ width: rightOpen ? 300 : 0, transition: "width 0.25s ease", overflow: "hidden", borderLeft: rightOpen ? "1px solid var(--border-subtle)" : "none", display: "flex", flexDirection: "column", background: "var(--bg-secondary)", flexShrink: 0 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Refinement</span>
              <button onClick={() => setRightOpen(false)} className="button ghost sm" style={{ height: 22, padding: "0 5px" }} title="Collapse panel">
                <PanelRightClose size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              {/* Rietveld Refinement Component */}
              {(experiment.candidate_phases?.length ?? 0) > 0 && (
                <RietveldRefinement
                  experimentId={experimentId}
                  cifFiles={experiment.cif_files || []}
                  selectedPhases={experiment.selected_refinement_phases || []}
                  rietveldResults={experiment.rietveld_results || null}
                  onComplete={() => {}}
                  onDataReady={() => {}}
                />
              )}

              {/* Crystal Structure (when available) */}
              {experiment.cif_files?.find((c) => c.parsed_data?.unit_cell) && (() => {
                const cif = experiment.cif_files.find((c) => c.parsed_data?.unit_cell)!;
                const pd = cif.parsed_data as Record<string, any>;
                const uc = pd?.unit_cell as Record<string, number> | undefined;
                const sg = pd?.space_group as string | undefined;
                const cs = pd?.crystal_system as string | undefined;
                const atoms = (pd?.atoms || []) as Array<Record<string, unknown>>;
                return (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Atom size={11} /> Crystal Structure
                    </div>
                    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                      {sg && <div style={{ fontSize: 11, fontWeight: 600 }}>{sg}{cs ? ` (${cs})` : ""}</div>}
                      {uc && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px", marginTop: 6 }}>
                          {Object.entries(uc).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                              <span style={{ color: "var(--text-muted)" }}>{k}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 550 }}>
                                {typeof v === "number" ? v.toFixed(4) : String(v)}
                                {["a", "b", "c"].includes(k) ? " \u00c5" : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {atoms.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)" }}>{atoms.length} atom{atoms.length !== 1 ? "s" : ""}</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
