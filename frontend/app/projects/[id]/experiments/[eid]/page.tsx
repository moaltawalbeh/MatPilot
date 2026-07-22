"use client";

import { useState, useMemo, useCallback, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers, Zap, Activity, BarChart2, Search, Database, CheckSquare,
  Target, Play, Check, X, Loader2, Clock, AlertTriangle, FlaskConical,
  ChevronRight, ChevronLeft, ArrowLeft, Box, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, TableProperties, Atom, Settings2,
  ZoomIn, ZoomOut, Maximize2, Download, RotateCcw, Eye, EyeOff, Trash2,
  ArrowUp, ArrowDown, FileText, FileCode, FileSpreadsheet, ClipboardList,
  Lock,
} from "lucide-react";
import { useDownloadPDFReport, useExperiment, useRunPipeline, useExperimentData, useRunRietveld } from "@/hooks/use-api";
import { XrdChart } from "@/components/charts/xrd-chart";
import { PhaseIdentification, getPhaseColor, PHASE_COLORS } from "@/components/experiment/phase-identification";
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

const AUTO_REFINEMENT_SEQUENCE = [
  "Scale Factor",
  "Background",
  "Zero Shift",
  "Unit Cell",
  "Peak Profile",
  "Atomic Coordinates",
  "Preferred Orientation",
  "Crystallite Size",
  "Microstrain",
];

type ExportFormat = "pdf" | "docx" | "txt";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeFileName(name: string) {
  return (name || "matpilot_experiment").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

const CONFIRMED_PHASES_KEY = "matpilot_confirmed_phases";

function loadConfirmedPhaseIds(experimentId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONFIRMED_PHASES_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw);
    const entry = map[experimentId];
    if (!entry || !Array.isArray(entry)) return [];
    if (entry.length > 0 && typeof entry[0] === "string") return entry;
    if (entry.length > 0 && typeof entry[0] === "number") {
      const saved: Set<number> = new Set(entry);
      return [];
    }
    return [];
  } catch { return []; }
}

function saveConfirmedPhaseIds(experimentId: string, sourceIds: string[]) {
  try {
    const raw = localStorage.getItem(CONFIRMED_PHASES_KEY);
    const map = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    map[experimentId] = sourceIds;
    localStorage.setItem(CONFIRMED_PHASES_KEY, JSON.stringify(map));
  } catch {}
}

function getGofColor(v: number): string {
  if (v < 1.2) return "var(--success)";
  if (v < 2.0) return "var(--accent-orange)";
  return "var(--error)";
}

function getRwpColor(v: number): string {
  if (v < 10) return "var(--success)";
  if (v < 20) return "var(--accent-orange)";
  return "var(--error)";
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div style={{
      width,
      height: 12,
      borderRadius: 4,
      background: "linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

function SkeletonChart() {
  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      gap: 10,
      background: "var(--surface-1)",
    }}>
      <SkeletonLine width="50%" />
      <SkeletonLine width="85%" />
      <SkeletonLine width="40%" />
      <SkeletonLine width="95%" />
      <SkeletonLine width="70%" />
      <SkeletonLine width="60%" />
    </div>
  );
}

export default function ExperimentWorkspacePage({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const resolvedParams = use(params);
  const { id: projectId, eid: experimentId } = resolvedParams;
  const router = useRouter();
  const { data: experiment, isLoading } = useExperiment(experimentId);
  const { data: rawData } = useExperimentData(projectId, experimentId);
  const runPipeline = useRunPipeline();
  const runRietveld = useRunRietveld();
  const downloadPdfReport = useDownloadPDFReport();
  const [autoRan, setAutoRan] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [showPeaks, setShowPeaks] = useState(false);
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

  const [selectedPhaseIndices, setSelectedPhaseIndices] = useState<Set<number>>(new Set());
  const [refinementMode, setRefinementMode] = useState<"auto" | "manual" | null>(null);
  const [phaseOrder, setPhaseOrder] = useState<number[]>([]);
  const [hiddenPhaseIndices, setHiddenPhaseIndices] = useState<Set<number>>(new Set());
  const [confirmedPhaseIds, setConfirmedPhaseIds] = useState<string[]>([]);
  const [phasesConfirmed, setPhasesConfirmed] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const phaseColorMap = useMemo(() => {
    const m = new Map<number, string>();
    if (experiment?.candidate_phases) {
      experiment.candidate_phases.forEach((_, idx) => {
        m.set(idx + 1, PHASE_COLORS[idx % PHASE_COLORS.length]);
      });
    }
    return m;
  }, [experiment?.candidate_phases]);

  useEffect(() => {
    if (experimentId) {
      const saved = loadConfirmedPhaseIds(experimentId);
      if (saved.length > 0) {
        setConfirmedPhaseIds(saved);
        setPhasesConfirmed(true);
        const ranks = new Set<number>();
        const phases = experiment?.candidate_phases || [];
        for (const sid of saved) {
          const idx = phases.findIndex((p) => p.source_id === sid);
          if (idx >= 0) ranks.add(idx + 1);
        }
        if (ranks.size > 0) setSelectedPhaseIndices(ranks);
      }
    }
  }, [experimentId, experiment?.candidate_phases]);

  useEffect(() => {
    const ranks = (experiment?.candidate_phases || []).map((p, idx) => p.rank ?? idx + 1);
    setPhaseOrder((prev) => {
      const kept = prev.filter((rank) => ranks.includes(rank));
      const added = ranks.filter((rank) => !kept.includes(rank));
      return [...kept, ...added];
    });
  }, [experiment?.candidate_phases]);

  const selectedPhaseRanks = useMemo(
    () => phaseOrder.filter((rank) => selectedPhaseIndices.has(rank)),
    [phaseOrder, selectedPhaseIndices],
  );

  const movePhase = useCallback((rank: number, direction: -1 | 1) => {
    setPhaseOrder((prev) => {
      const idx = prev.indexOf(rank);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      return next;
    });
  }, []);

  const removePhase = useCallback((rank: number) => {
    setSelectedPhaseIndices((prev) => {
      const next = new Set(prev);
      next.delete(rank);
      return next;
    });
  }, []);

  const togglePhaseVisibility = useCallback((rank: number) => {
    setHiddenPhaseIndices((prev) => {
      const next = new Set(prev);
      next.has(rank) ? next.delete(rank) : next.add(rank);
      return next;
    });
  }, []);

  const shouldAutoRun = useMemo(() => {
    if (!experiment || autoRan) return false;
    return experiment.has_pattern_data && (!experiment.pipeline_stages || experiment.pipeline_stages.length === 0);
  }, [experiment, autoRan]);

  const handleAutoRun = useCallback(() => {
    if (shouldAutoRun && experimentId) {
      setAutoRan(true);
      runPipeline.mutate({
        experimentId,
        data: { stages: ["background_correction", "ka2_stripping", "noise_reduction", "intensity_normalization", "peak_detection"] },
      });
    }
  }, [shouldAutoRun, experimentId, runPipeline]);

  useEffect(() => {
    if (shouldAutoRun) handleAutoRun();
  }, [shouldAutoRun, handleAutoRun]);

  const rietveldResults = experiment?.rietveld_results;
  useEffect(() => {
    if (rietveldResults?.status === "completed") {
      const t = setTimeout(() => setStatsVisible(true), 120);
      return () => clearTimeout(t);
    }
    setStatsVisible(false);
  }, [rietveldResults]);

  const stages = experiment?.pipeline_stages || [];
  const completedStages = stages.filter((s: PipelineStage) => s.status === "completed");
  const failedStage = stages.find((s: PipelineStage) => s.status === "failed");
  const isRunning = runPipeline.isPending;
  const isRietveldRunning = runRietveld.isPending;

  const hasCandidatePhases = (experiment?.candidate_phases?.length ?? 0) > 0;
  const pipelineProcessingDone = completedStages.some((s: PipelineStage) => s.id === "peak_detection") &&
    (completedStages.some((s: PipelineStage) => s.id === "phase_identification") || hasCandidatePhases);
  const rietveldCompleted = rietveldResults?.status === "completed";
  const hasConfirmedPhases = phasesConfirmed && confirmedPhaseIds.length > 0;
  const showRefinementMode = pipelineProcessingDone && hasCandidatePhases && hasConfirmedPhases && !rietveldCompleted && !isRietveldRunning && refinementMode === null;
  const showRietveldPanel = refinementMode !== null && !rietveldCompleted;
  const showCandidatePhases = pipelineProcessingDone && hasCandidatePhases && !rietveldCompleted;

  const filteredRietveldResults = useMemo(() => {
    if (!rietveldResults?.phases_used || !experiment?.candidate_phases) return rietveldResults;
    const candidateLen = experiment.candidate_phases.length;
    const phasesUsedLen = rietveldResults.phases_used.length;
    if (phasesUsedLen <= confirmedPhaseIds.length) return rietveldResults;
    const confirmedSet = new Set(confirmedPhaseIds);
    const keptIndices = new Set<number>();
    experiment.candidate_phases.forEach((cp, idx) => {
      if (confirmedSet.has(cp.source_id)) keptIndices.add(idx);
    });
    if (keptIndices.size === 0 || keptIndices.size >= phasesUsedLen) return rietveldResults;
    const filteredPhases = rietveldResults.phases_used.filter((_: any, idx: number) => keptIndices.has(idx));
    return { ...rietveldResults, phases_used: filteredPhases };
  }, [rietveldResults, confirmedPhaseIds, experiment?.candidate_phases]);

  const runAutomaticRefinement = useCallback(() => {
    if (experimentId) {
      const payload = { workflow: "auto" as const, selected_cif_ids: confirmedPhaseIds.length > 0 ? confirmedPhaseIds : undefined };
      console.log("[MATPILOT] runAutomaticRefinement", { experimentId, confirmedPhaseIds, cifFilesCount: experiment?.cif_files?.length ?? 0, payload });
      runRietveld.mutate({ experimentId, data: payload });
    }
  }, [experimentId, runRietveld, confirmedPhaseIds, experiment?.cif_files]);

  const handleModeSelect = useCallback((mode: "auto" | "manual") => {
    setRefinementMode(mode);
  }, []);

  const handleSelectionChange = useCallback((indices: Set<number>) => {
    setSelectedPhaseIndices(indices);
    setRefinementMode(null);
    setPhasesConfirmed(false);
    setConfirmedPhaseIds([]);
    if (experimentId) saveConfirmedPhaseIds(experimentId, []);
  }, [experimentId]);

  const handleConfirmPhases = useCallback(() => {
    const sourceIds: string[] = [];
    const phases = experiment?.candidate_phases || [];
    for (const rank of selectedPhaseIndices) {
      const phase = phases.find((p) => p.rank === rank);
      if (phase?.source_id) sourceIds.push(phase.source_id);
    }
    console.log("[MATPILOT] handleConfirmPhases", { selectedPhaseIndices: Array.from(selectedPhaseIndices), sourceIds, codIds: (experiment?.cif_files || []).map((c: any) => c.cod_id) });
    setConfirmedPhaseIds(sourceIds);
    setPhasesConfirmed(true);
    if (experimentId) saveConfirmedPhaseIds(experimentId, sourceIds);
  }, [selectedPhaseIndices, experiment?.candidate_phases, experimentId]);

  const handlePhaseContinue = useCallback(() => {
    setRightOpen(true);
  }, []);

  const buildReportText = useCallback(() => {
    const rv = experiment?.rietveld_results;
    const lines: string[] = [];
    lines.push("MATPILOT XRD REPORT");
    lines.push("=".repeat(72));
    lines.push("");
    lines.push(`Project ID: ${projectId}`);
    lines.push(`Experiment: ${experiment?.name || "Untitled Experiment"}`);
    lines.push(`Material: ${experiment?.material || "N/A"}`);
    lines.push(`Analysis Date: ${new Date().toLocaleString()}`);
    lines.push(`Uploaded File: ${experiment?.primary_file_id || "N/A"}`);
    lines.push(`Data Points: ${experiment?.data_points?.toLocaleString() ?? "N/A"}`);
    if (experiment?.two_theta_range) {
      lines.push(`Measurement Range: ${experiment.two_theta_range[0].toFixed(2)} to ${experiment.two_theta_range[1].toFixed(2)} deg 2theta`);
    }
    lines.push("");
    lines.push("SELECTED PHASES");
    lines.push("-".repeat(72));
    const confirmedPhases = confirmedPhaseIds.map((sid) => experiment?.candidate_phases?.find((p) => p.source_id === sid)).filter(Boolean);
    confirmedPhases.forEach((phase, idx) => {
      const rank = phase?.rank ?? idx + 1;
      const color = phaseColorMap.get(rank) || PHASE_COLORS[idx % PHASE_COLORS.length];
      lines.push(`${idx + 1}. ${phase?.material_name || `Phase ${rank}`} | ${phase?.material_formula || "N/A"} | Score ${(((phase?.match_score ?? 0) * 100)).toFixed(1)}% | ${phase?.confidence || "N/A"} | Color ${color}`);
    });
    if (confirmedPhases.length === 0) lines.push("No phases selected.");
    lines.push("");
    lines.push("PHASE IDENTIFICATION RESULTS");
    lines.push("-".repeat(72));
    (experiment?.candidate_phases || []).forEach((phase, idx) => {
      lines.push(`${idx + 1}. ${phase.material_name || "Unknown"} (${phase.material_formula || "N/A"}) - ${((phase.match_score ?? 0) * 100).toFixed(1)}%, ${phase.confidence || "N/A"}`);
    });
    lines.push("");
    lines.push("REFINEMENT");
    lines.push("-".repeat(72));
    lines.push(`Mode: ${rv?.workflow || refinementMode || "N/A"}`);
    lines.push(`Status: ${rv?.status || (isRietveldRunning ? "running" : "not run")}`);
    if (rv) {
      lines.push(`Rwp: ${rv.r_wp?.toFixed(4) ?? "N/A"}%`);
      lines.push(`Rp: ${rv.r_p?.toFixed(4) ?? "N/A"}%`);
      lines.push(`Rexp: ${rv.r_exp?.toFixed(4) ?? "N/A"}%`);
      lines.push(`Chi squared: ${rv.chi_squared?.toFixed(4) ?? "N/A"}`);
      lines.push(`GOF: ${rv.gof?.toFixed(4) ?? "N/A"}`);
      lines.push(`Iterations: ${rv.iterations ?? "N/A"}`);
      lines.push("");
      lines.push("REFINED PARAMETERS");
      lines.push("-".repeat(72));
      if (rv.parameters) {
        lines.push(`Scale: ${rv.parameters.scale ?? "N/A"}`);
        lines.push(`Zero Shift: ${rv.parameters.zero_shift ?? "N/A"}`);
        lines.push(`U: ${rv.parameters.U ?? "N/A"}`);
        lines.push(`V: ${rv.parameters.V ?? "N/A"}`);
        lines.push(`W: ${rv.parameters.W ?? "N/A"}`);
        rv.parameters.phase_fractions?.forEach((fraction, idx) => lines.push(`Phase ${idx + 1}: ${(fraction * 100).toFixed(2)}%`));
      }
    }
    lines.push("");
    lines.push("AI INTERPRETATION");
    lines.push("-".repeat(72));
    lines.push(String(experiment?.metadata?.ai_interpretation || "AI interpretation is ready to be attached when guidance services are enabled."));
    return lines.join("\n");
  }, [experiment, projectId, confirmedPhaseIds, phaseColorMap, refinementMode, isRietveldRunning]);

  const exportReport = useCallback(async (format: ExportFormat) => {
    setExportingFormat(format);
    try {
      const base = safeFileName(experiment?.name || "matpilot_xrd_report");
      if (format === "pdf") {
        await downloadPdfReport.mutateAsync(experimentId);
      } else if (format === "docx") {
        const html = `<html><head><meta charset="utf-8"><title>MatPilot Report</title></head><body><pre style="font-family:Calibri,Arial,sans-serif;white-space:pre-wrap">${buildReportText()}</pre></body></html>`;
        downloadBlob(new Blob([html], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${base}_report.docx`);
      } else {
        downloadBlob(new Blob([buildReportText()], { type: "text/plain;charset=utf-8" }), `${base}_report.txt`);
      }
    } finally {
      setExportingFormat(null);
    }
  }, [buildReportText, downloadPdfReport, experiment?.name, experimentId]);

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
    return markers.filter((m: any) => !hiddenPhaseIndices.has((m.phase_index ?? 0) + 1)).map((m: any) => ({
      two_theta: m.two_theta,
      intensity: m.intensity,
      hkl: m.hkl || "",
      color: phaseColorMap.get(m.phase_index + 1) ?? PHASE_COLORS[m.phase_index % PHASE_COLORS.length],
      phaseName: m.phase_name || `Phase ${(m.phase_index ?? 0) + 1}`,
    }));
  }, [experiment, phaseColorMap, hiddenPhaseIndices]);

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          <div style={{ height: 44, borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }} />
          <div style={{ height: 36, borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", display: "flex", alignItems: "center", padding: "0 20px" }}>
            <SkeletonLine width="40%" />
          </div>
          <div style={{ flex: 1, display: "flex" }}>
            <div style={{ width: 280, borderRight: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonLine width="100%" />
              <SkeletonLine width="80%" />
              <SkeletonLine width="90%" />
              <SkeletonLine width="70%" />
              <SkeletonLine width="95%" />
            </div>
            <div style={{ flex: 1 }}><SkeletonChart /></div>
            <div style={{ width: 300, borderLeft: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <SkeletonLine width="60%" />
              <SkeletonLine width="100%" />
              <SkeletonLine width="80%" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!experiment) {
    return (
      <AppShell>
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ padding: 40, textAlign: "center" }}>
            <AlertTriangle size={32} style={{ color: "var(--warning)", marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Experiment not found</div>
            <Link href={`/projects/${projectId}`} className="button" style={{ marginTop: 16, textDecoration: "none" }}>Back to project</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const completionPercent = Math.round((completedStages.length / PIPELINE_STAGES.length) * 100);

  return (
    <AppShell>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)", overflow: "hidden" }}>
        <style>{`
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @keyframes statsSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        `}</style>

        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-secondary)", flexShrink: 0 }}>
          <Link href={`/projects/${projectId}`} style={{ color: "var(--text-muted)", display: "flex", padding: 4, borderRadius: "var(--radius-sm)", transition: "background 0.15s" }}>
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

        {/* Pipeline Progress */}
        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "8px 20px", background: "var(--bg-secondary)", flexShrink: 0 }}>
          <div style={{ height: 3, borderRadius: 2, background: "var(--surface-2)", marginBottom: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${completionPercent}%`, borderRadius: 2, background: failedStage ? "var(--error)" : isRunning ? "var(--accent-cyan)" : completionPercent === 100 ? "var(--success)" : "var(--accent-cyan)", transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {PIPELINE_STAGES.map((stage, idx) => {
              const stageResult = stages.find((s: PipelineStage) => s.id === stage.id);
              const status = stageResult?.status || "pending";
              const done = status === "completed";
              const fail = status === "failed";
              const run = status === "running";
              return (
                <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div
                    title={`${stage.name}: ${stage.desc}${done && stageResult?.duration_seconds != null ? ` (${stageResult.duration_seconds.toFixed(1)}s)` : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "-0.1px",
                      background: done ? "var(--accent-emerald-bg)" : fail ? "var(--error-bg)" : run ? "var(--accent-cyan-bg)" : "var(--surface-2)",
                      color: done ? "var(--accent-emerald)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--text-muted)",
                      border: `1px solid ${done ? "var(--accent-emerald)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                      transition: "all 0.3s ease",
                      transform: run ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {done ? <Check size={9} /> : fail ? <X size={9} /> : run ? <Loader2 size={9} className="spin" /> : null}
                    <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stage.name}</span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && <div style={{ width: 6, height: 1, background: done ? "var(--accent-emerald)" : "var(--border-subtle)", borderRadius: 1, transition: "background 0.3s" }} />}
                </div>
              );
            })}
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8, whiteSpace: "nowrap" }}>
              {completedStages.length}/{PIPELINE_STAGES.length}
              {isRunning && <span style={{ color: "var(--accent-cyan)", marginLeft: 6 }}>Processing\u2026</span>}
              {failedStage && <span style={{ color: "var(--error)", marginLeft: 6 }}>Failed</span>}
            </span>
          </div>
        </div>

        {/* Main: 3-column layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* Left Panel */}
          <div style={{ width: leftOpen ? 280 : 0, transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden", borderRight: leftOpen ? "1px solid var(--border-subtle)" : "none", display: "flex", flexDirection: "column", background: "var(--bg-secondary)", flexShrink: 0 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Pipeline & Phases</span>
              <button onClick={() => setLeftOpen(false)} className="button ghost sm" style={{ height: 22, padding: "0 5px" }} title="Collapse panel">
                <PanelLeftClose size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              <button
                onClick={() => { if (experimentId) runPipeline.mutate({ experimentId, data: {} }); }}
                disabled={isRunning}
                className="button primary"
                style={{ width: "100%", justifyContent: "center", height: 32, fontSize: 12, fontWeight: 600, marginBottom: 12 }}
              >
                {isRunning ? <><Loader2 size={13} className="spin" /> Processing\u2026</> : <><Play size={13} /> Run Full Pipeline</>}
              </button>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Uploaded Pattern</div>
                <div style={{ display: "grid", gap: 5, padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                  {[
                    ["File", experiment.primary_file_id || "Pattern data"],
                    ["Range", experiment.two_theta_range ? `${experiment.two_theta_range[0].toFixed(2)}\u00b0 to ${experiment.two_theta_range[1].toFixed(2)}\u00b0` : "N/A"],
                    ["Points", experiment.data_points?.toLocaleString() || "0"],
                    ["Wavelength", experiment.wavelength_angstrom ? `${experiment.wavelength_angstrom.toFixed(5)} A` : "N/A"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10 }}>
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 550, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                    </div>
                  ))}
                  <div style={{ height: 30, marginTop: 2, borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "end", padding: "4px 8px", gap: 3 }}>
                    {chartData.slice(0, 28).map((point, idx) => {
                      const maxI = Math.max(...chartData.slice(0, 28).map((p) => p.Experimental || 0), 1);
                      return <span key={idx} style={{ width: 3, height: Math.max(3, ((point.Experimental || 0) / maxI) * 20), background: "var(--accent-orange)", borderRadius: 2, opacity: 0.75 }} />;
                    })}
                  </div>
                </div>
              </div>

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
                    <div key={stage.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: "var(--radius-sm)", background: done ? "var(--success-bg)" : fail ? "var(--error-bg)" : run ? "var(--accent-cyan-bg)" : "transparent", border: `1px solid ${done ? "rgba(16,185,129,0.12)" : fail ? "rgba(239,68,68,0.12)" : run ? "rgba(6,182,212,0.12)" : "transparent"}`, transition: "all 0.2s" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "var(--radius-xs)", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "var(--success)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--surface-3)", flexShrink: 0, transition: "background 0.2s" }}>
                        {done ? <Check size={9} style={{ color: "white" }} /> : fail ? <X size={9} style={{ color: "white" }} /> : run ? <Loader2 size={9} className="spin" style={{ color: "white" }} /> : <Icon size={9} style={{ color: "var(--text-muted)" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 550, color: done ? "var(--success)" : fail ? "var(--error)" : run ? "var(--accent-cyan)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.2s" }}>{stage.name}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
                          {done && stageResult?.duration_seconds != null ? `${stageResult.duration_seconds.toFixed(1)}s` : fail && stageResult?.error ? stageResult.error.substring(0, 30) : stage.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {completedStages.some((s: PipelineStage) => s.id === "peak_detection") && (
                <div style={{ marginTop: 14 }}>
                  <PhaseIdentification
                    experimentId={experimentId}
                    candidatePhases={experiment.candidate_phases || []}
                    cifFiles={experiment.cif_files || []}
                    onComplete={() => {}}
                    selectedPhaseIndices={selectedPhaseIndices}
                    onSelectionChange={handleSelectionChange}
                    onContinue={handlePhaseContinue}
                    phaseColors={phaseColorMap}
                  />

                  {selectedPhaseIndices.size > 0 && (
                    <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Workflow Progress</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {[
                          { label: "Select Phases", done: true },
                          { label: "Confirm Selection", done: phasesConfirmed },
                          { label: "Choose Refinement Mode", done: refinementMode !== null },
                          { label: "Run Refinement", done: rietveldCompleted },
                        ].map((step, idx, arr) => (
                          <div key={step.label} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                              <div style={{ width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", background: step.done ? "var(--accent-emerald)" : idx === arr.findIndex((s) => !s.done) ? "var(--accent-orange)" : "var(--surface-3)", color: step.done || idx === arr.findIndex((s) => !s.done) ? "white" : "var(--text-muted)", fontSize: 9, fontWeight: 700, transition: "all 0.3s" }}>
                                {step.done ? <Check size={10} /> : idx + 1}
                              </div>
                              {idx < arr.length - 1 && <div style={{ width: 1, height: 14, background: step.done ? "var(--accent-emerald)" : "var(--border-subtle)", transition: "background 0.3s" }} />}
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 550, color: step.done ? "var(--accent-emerald)" : idx === arr.findIndex((s) => !s.done) ? "var(--text-primary)" : "var(--text-muted)", marginTop: 1, transition: "color 0.3s" }}>{step.label}</span>
                          </div>
                        ))}
                      </div>
                      {!phasesConfirmed && selectedPhaseIndices.size > 0 && (
                        <button onClick={handleConfirmPhases} className="button primary" style={{ width: "100%", justifyContent: "center", marginTop: 10, height: 34, fontSize: 12, fontWeight: 600 }}>
                          <Lock size={13} /> Confirm {selectedPhaseIndices.size} Selected Phase{selectedPhaseIndices.size !== 1 ? "s" : ""}
                        </button>
                      )}
                      {phasesConfirmed && !rietveldCompleted && !isRietveldRunning && refinementMode === null && (
                        <button onClick={handlePhaseContinue} className="button primary" style={{ width: "100%", justifyContent: "center", marginTop: 10, height: 34, fontSize: 12, fontWeight: 600 }}>
                          <ChevronRight size={14} /> Next: Choose Refinement Mode
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {experiment.detected_peaks && experiment.detected_peaks.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => setShowPeaks(!showPeaks)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <TableProperties size={11} />
                    Peaks ({experiment.detected_peaks.length})
                    <ChevronRight size={10} style={{ transform: showPeaks ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                  </button>
                  {showPeaks && (
                    <div style={{ marginTop: 6, maxHeight: 200, overflowY: "auto", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
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

          {/* Center: Chart Area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
            {!leftOpen && (
              <button onClick={() => setLeftOpen(true)} style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 24, height: 48, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} title="Show left panel">
                <PanelLeftOpen size={13} />
              </button>
            )}
            {!rightOpen && (
              <button onClick={() => setRightOpen(true)} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 24, height: 48, borderRadius: "var(--radius-sm)", background: "var(--surface-2)", border: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }} title="Show right panel">
                <PanelRightOpen size={13} />
              </button>
            )}

            {chartData.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", flexShrink: 0 }}>
                <BarChart2 size={12} style={{ color: "var(--accent-orange)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Diffraction Pattern</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <button onClick={() => setChartFullscreen(!chartFullscreen)} title={chartFullscreen ? "Exit Fullscreen" : "Fullscreen"} className="button ghost sm" style={{ height: 24, width: 24, padding: 0, display: "grid", placeItems: "center" }}>
                    <Maximize2 size={12} />
                  </button>
                </div>
              </div>
            )}

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

            {/* Floating Quick Stats Bar */}
            {rietveldResults && (
              <div style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: statsVisible ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(12px)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "8px 20px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                opacity: statsVisible ? 1 : 0,
                transition: "opacity 0.4s ease, transform 0.4s ease",
                zIndex: 5,
              }}>
                {[
                  { label: "R_wp", value: rietveldResults.r_wp, unit: "%", colorFn: getRwpColor },
                  { label: "R_p", value: rietveldResults.r_p, unit: "%" },
                  { label: "R_exp", value: rietveldResults.r_exp, unit: "%" },
                  { label: "\u03c7\u00b2", value: rietveldResults.chi_squared },
                  { label: "GoF", value: rietveldResults.gof, colorFn: getGofColor },
                ].map((s) => {
                  const val = s.value;
                  const color = val != null && "colorFn" in s && s.colorFn ? s.colorFn(val) : "var(--text-primary)";
                  return (
                    <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "var(--font-mono)" }}>
                        {val != null ? val.toFixed(2) : "\u2014"}
                        {"unit" in s && s.unit && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>{s.unit}</span>}
                      </span>
                    </div>
                  );
                })}
                {rietveldResults.iterations && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Iterations</span>
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{rietveldResults.iterations}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div style={{ width: rightOpen ? 300 : 0, transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden", borderLeft: rightOpen ? "1px solid var(--border-subtle)" : "none", display: "flex", flexDirection: "column", background: "var(--bg-secondary)", flexShrink: 0 }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>Refinement</span>
              <button onClick={() => setRightOpen(false)} className="button ghost sm" style={{ height: 22, padding: "0 5px" }} title="Collapse panel">
                <PanelRightClose size={12} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>

              {/* Choose Refinement Mode */}
              {showRefinementMode && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Choose Refinement Mode</h3>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Select how to proceed with Rietveld refinement</p>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                      {Array.from(selectedPhaseIndices).map((rank) => {
                        const phase = experiment.candidate_phases?.find((p) => p.rank === rank);
                        const color = phaseColorMap.get(rank) ?? getPhaseColor(rank - 1);
                        return (
                          <span key={rank} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}40` }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                            {phase?.material_formula || `Phase ${rank}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div
                      onClick={() => handleModeSelect("auto")}
                      style={{
                        cursor: "pointer",
                        padding: "14px 12px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-subtle)",
                        transition: "all 0.2s",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-orange)"; e.currentTarget.style.background = "var(--accent-orange-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--surface-1)"; }}
                    >
                      <Zap size={24} style={{ color: "var(--accent-orange)", margin: "0 auto 8px" }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Automatic</div>
                      <span className="badge good" style={{ marginTop: 4, display: "inline-flex" }}>Recommended</span>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>Opens the one-click refinement sequence</p>
                    </div>
                    <div
                      onClick={() => handleModeSelect("manual")}
                      style={{
                        cursor: "pointer",
                        padding: "14px 12px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-subtle)",
                        transition: "all 0.2s",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-violet)"; e.currentTarget.style.background = "rgba(139,92,246,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--surface-1)"; }}
                    >
                      <Settings2 size={24} style={{ color: "var(--accent-violet)", margin: "0 auto 8px" }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Manual</div>
                      <span className="badge" style={{ marginTop: 4, display: "inline-flex" }}>Advanced</span>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.4 }}>Opens the parameter tree workspace</p>
                    </div>
                  </div>
                </div>
              )}

              {showRietveldPanel && refinementMode === "auto" && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Zap size={13} style={{ color: "var(--accent-orange)" }} />
                      Automatic Refinement
                    </div>
                    <div style={{ height: 5, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", width: isRietveldRunning ? "55%" : "0%", borderRadius: 999, background: "var(--accent-orange)", transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, color: "var(--text-muted)" }}>
                      <span>Status: {isRietveldRunning ? "Running" : "Ready"}</span>
                      <span>Selected: {confirmedPhaseIds.length} phase{confirmedPhaseIds.length !== 1 ? "s" : ""}</span>
                      <span>Iteration: {isRietveldRunning ? "optimizing" : "0"}</span>
                      <span>ETA: {isRietveldRunning ? "calculating" : "on run"}</span>
                    </div>
                    <button onClick={runAutomaticRefinement} disabled={isRietveldRunning || confirmedPhaseIds.length === 0} className="button primary" style={{ width: "100%", justifyContent: "center", marginTop: 10, height: 34 }}>
                      {isRietveldRunning ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
                      Run Automatic Refinement
                    </button>
                    {runRietveld.isError && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: "var(--error-bg)", color: "var(--error)", fontSize: 11, marginTop: 6 }}>
                        <AlertTriangle size={13} />
                        <span>{(runRietveld.error as any)?.detail || runRietveld.error?.message || "Refinement failed"}</span>
                      </div>
                    )}
                    <button onClick={() => setRefinementMode(null)} disabled={isRietveldRunning} className="button ghost sm" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
                      Change Mode
                    </button>
                  </div>

                  <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Professional Sequence</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {AUTO_REFINEMENT_SEQUENCE.map((step, idx) => (
                        <div key={step} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: "var(--text-secondary)" }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 9 }}>{idx + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {showRietveldPanel && refinementMode === "manual" && (
                <div style={{ marginBottom: 14, padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Settings2 size={13} style={{ color: "var(--accent-violet)" }} />
                    Manual Refinement
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 10 }}>
                    Parameter groups are organized as Project, Experiment, Instrument, Background, phase cells, atoms, profile, preferred orientation, size, and strain.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {confirmedPhaseIds.map((sourceId) => {
                      const phase = experiment.candidate_phases?.find((p) => p.source_id === sourceId);
                      const rank = phase?.rank ?? 0;
                      const color = phaseColorMap.get(rank) ?? getPhaseColor(rank - 1);
                      return (
                        <div key={sourceId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: "var(--radius-sm)", background: `${color}10`, border: `1px solid ${color}30` }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 600 }}>{phase?.material_formula || `Phase ${rank}`}</span>
                          <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>{phase?.source_provider}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => router.push(`/manual-refinement?experiment=${experimentId}`)} className="button primary" style={{ width: "100%", justifyContent: "center", height: 34, marginTop: 10 }}>
                    <Settings2 size={13} /> Open Manual Workspace
                  </button>
                  <button onClick={() => setRefinementMode(null)} className="button ghost sm" style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
                    Change Mode
                  </button>
                </div>
              )}

              {/* Rietveld Running State */}
              {isRietveldRunning && (
                <div style={{ padding: "20px 16px", textAlign: "center" }}>
                  <Loader2 size={24} className="spin" style={{ color: "var(--accent-cyan)", margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Running Refinement</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Optimizing crystal structure parameters\u2026</div>
                </div>
              )}

              {/* Rietveld Results */}
              {rietveldCompleted && (
                <>
                  <RietveldRefinement
                    experimentId={experimentId}
                    cifFiles={experiment.cif_files || []}
                    selectedPhases={experiment.selected_refinement_phases || []}
                    rietveldResults={filteredRietveldResults || null}
                    onComplete={() => {}}
                    onDataReady={() => {}}
                    confirmedPhaseIds={confirmedPhaseIds}
                  />
                  <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                      <FileText size={11} /> Export Report
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[
                        { format: "pdf" as ExportFormat, label: "PDF", icon: FileText },
                        { format: "docx" as ExportFormat, label: "DOCX", icon: FileCode },
                        { format: "txt" as ExportFormat, label: "TXT", icon: FileSpreadsheet },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.format} onClick={() => exportReport(item.format)} disabled={exportingFormat === item.format} className="button ghost sm" style={{ justifyContent: "center", height: 30, fontSize: 10 }}>
                            {exportingFormat === item.format ? <Loader2 size={11} className="spin" /> : <Icon size={11} />}
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Professional Phase Manager */}
              {showCandidatePhases && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <ClipboardList size={11} style={{ color: "var(--accent-orange)" }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Phase Manager ({selectedPhaseIndices.size}/{experiment.candidate_phases.length})
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {phaseOrder.map((rank, idx) => {
                      const phaseRaw = experiment.candidate_phases.find((p: any, phaseIdx: number) => (p.rank ?? phaseIdx + 1) === rank);
                      if (!phaseRaw) return null;
                      const phase = phaseRaw as any;
                      const isSelected = selectedPhaseIndices.has(rank);
                      const color = phaseColorMap.get(rank) ?? getPhaseColor(idx);
                      const fraction = phase.fraction ?? phase.rwp_fraction ?? null;
                      const hidden = hiddenPhaseIndices.has(rank);
                      return (
                        <div key={rank} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: "var(--radius-sm)", background: isSelected ? `${color}10` : "var(--surface-1)", border: `1px solid ${isSelected ? `${color}40` : "var(--border-subtle)"}`, opacity: isSelected ? (hidden ? 0.55 : 1) : 0.45, transition: "all 0.15s ease" }}>
                          <div style={{ width: 10, height: 10, borderRadius: 3, background: color, border: "1px solid rgba(255,255,255,0.35)", flexShrink: 0 }} title={`Phase color ${color}`} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 550, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isSelected ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {phase.material_name || phase.name || `Phase ${rank}`}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", display: "flex", gap: 5 }}>
                              <span style={{ fontFamily: "var(--font-mono)" }}>{phase.material_formula || "N/A"}</span>
                              <span>{phase.crystal_system || phase.space_group || phase.confidence || ""}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <span style={{ minWidth: 38, textAlign: "right", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600, color }}>
                              {fraction != null ? `${(fraction * 100).toFixed(1)}%` : "—"}
                            </span>
                            <button onClick={() => togglePhaseVisibility(rank)} className="button ghost sm" style={{ height: 22, width: 22, padding: 0 }} title={hidden ? "Show phase markers" : "Hide phase markers"}>
                              {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                            </button>
                            <button onClick={() => movePhase(rank, -1)} disabled={idx === 0} className="button ghost sm" style={{ height: 22, width: 22, padding: 0 }} title="Move phase up">
                              <ArrowUp size={11} />
                            </button>
                            <button onClick={() => movePhase(rank, 1)} disabled={idx === phaseOrder.length - 1} className="button ghost sm" style={{ height: 22, width: 22, padding: 0 }} title="Move phase down">
                              <ArrowDown size={11} />
                            </button>
                            <button onClick={() => removePhase(rank)} disabled={!isSelected} className="button ghost sm" style={{ height: 22, width: 22, padding: 0, color: "var(--error)" }} title="Remove from refinement">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Crystal Structure */}
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
