"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Page } from "@/components/ui/page";
import { useManualRefinement, useRefinementParameters } from "@/hooks/use-api";
import { apiService } from "@/lib/api-client";
import type { RefinementParameter, ManualRefinementSession, CIFFile, RietveldResults } from "@/types";
import {
  Play, RotateCcw, Undo2, Lock, Unlock, ChevronDown, ChevronRight,
  Settings2, Layers, FlaskConical, Loader2, Download, Zap, Target,
  TrendingDown, BarChart3, RefreshCw, Eye, EyeOff, Copy,
} from "lucide-react";

// ── Category config ──────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "scale", "background", "profile", "instrument", "lattice", "phase", "sample", "microstructure",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  scale: "Scale & Zero",
  background: "Background",
  profile: "Profile Shape",
  instrument: "Instrument",
  lattice: "Lattice Parameters",
  phase: "Phase Fractions",
  sample: "Sample",
  microstructure: "Microstructure",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  scale: <Target size={13} />,
  background: <Layers size={13} />,
  profile: <BarChart3 size={13} />,
  instrument: <Settings2 size={13} />,
  lattice: <FlaskConical size={13} />,
  phase: <Copy size={13} />,
  sample: <RefreshCw size={13} />,
  microstructure: <Zap size={13} />,
};

// ── Presets ──────────────────────────────────────────────────────────

const PRESETS: Record<string, string[]> = {
  "Background First": ["bg_c0", "bg_c1", "bg_c2", "bg_c3", "scale", "zero_shift"],
  "Profile Shape": ["U", "V", "W", "eta"],
  "Standard Profile": ["scale", "zero_shift", "bg_c0", "bg_c1", "bg_c2", "bg_c3", "U", "V", "W", "eta"],
  "Lattice Only (Phase 0)": ["lattice_p0_a", "lattice_p0_b", "lattice_p0_c"],
};

// ── Utility ──────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 4): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(decimals);
}

function rwpColor(rwp: number | null): string {
  if (rwp == null) return "var(--text-muted)";
  if (rwp < 5) return "var(--success)";
  if (rwp < 15) return "var(--accent-amber)";
  return "var(--error)";
}

function gofColor(gof: number | null): string {
  if (gof == null) return "var(--text-muted)";
  if (gof > 0.8 && gof < 1.5) return "var(--success)";
  if (gof < 2.0) return "var(--accent-amber)";
  return "var(--error)";
}

// ── Styles ───────────────────────────────────────────────────────────

const S = {
  layout: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: "16px",
    height: "calc(100vh - 180px)",
    minHeight: 600,
  },
  leftPanel: {
    display: "flex",
    flexDirection: "column" as const,
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    overflow: "hidden",
  },
  leftHeader: {
    padding: "14px 16px 12px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  leftTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  leftActions: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap" as const,
  },
  paramList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "4px 0",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px 6px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    cursor: "pointer",
    userSelect: "none" as const,
  },
  paramRow: {
    display: "grid",
    gridTemplateColumns: "28px 1fr 80px 52px",
    alignItems: "center",
    gap: 4,
    padding: "5px 14px 5px 10px",
    fontSize: 12,
    transition: "background 0.1s ease",
    cursor: "default",
  },
  lockBtn: {
    width: 22,
    height: 22,
    borderRadius: "var(--radius-xs)",
    border: "none",
    background: "transparent",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    transition: "all 0.12s ease",
    color: "var(--text-tertiary)",
    padding: 0,
  },
  paramName: {
    fontSize: 12,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  paramInput: {
    width: "100%",
    height: 24,
    fontSize: 11,
    padding: "0 6px",
    borderRadius: "var(--radius-xs)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    textAlign: "right" as const,
    outline: "none",
  },
  paramUnc: {
    fontSize: 10,
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    textAlign: "right" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  rightPanel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    overflow: "hidden",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  metricCard: {
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    padding: "12px 14px",
    textAlign: "center" as const,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "-0.5px",
  },
  plotArea: {
    flex: 1,
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
    minHeight: 300,
  },
  plotHeader: {
    padding: "10px 16px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  plotTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  plotCanvas: {
    flex: 1,
    position: "relative" as const,
    overflow: "hidden",
  },
  bottomBar: {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  stepCounter: {
    fontSize: 12,
    color: "var(--text-tertiary)",
    fontFamily: "var(--font-mono)",
    padding: "0 8px",
  },
  historyTimeline: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    overflow: "hidden",
  },
  historyDot: (active: boolean, improved: boolean) => ({
    width: active ? 10 : 7,
    height: active ? 10 : 7,
    borderRadius: "50%",
    background: active
      ? "var(--accent-orange)"
      : improved
      ? "var(--success)"
      : "var(--surface-4)",
    border: active ? "2px solid var(--accent-orange-bright)" : "none",
    transition: "all 0.2s ease",
    flexShrink: 0,
  }),
  initOverlay: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 16,
    padding: 40,
    textAlign: "center" as const,
  },
};

// ── DiffractionPlot component (SVG-based) ────────────────────────────

function DiffractionPlot({
  patterns,
  braggMarkers,
  height,
}: {
  patterns: { two_theta: number[]; observed: number[]; calculated: number[]; difference: number[]; background: number[] } | null;
  braggMarkers: RietveldResults["bragg_markers"];
  height: number;
}) {
  if (!patterns) {
    return (
      <div style={{ ...S.plotCanvas, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: 40 }}>
          <BarChart3 size={36} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Run a refinement step to see the diffraction pattern</p>
        </div>
      </div>
    );
  }

  const { two_theta: tth, observed: obs, calculated: calc, difference: diff, background: bg } = patterns;
  const n = tth.length;
  if (n === 0) return null;

  const tthMin = tth[0];
  const tthMax = tth[n - 1];
  const allVals = [...obs, ...calc];
  const iMin = 0;
  const iMax = Math.max(...allVals) * 1.1;

  const W = 900;
  const H = height || 320;
  const pad = { top: 20, right: 20, bottom: 36, left: 50 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const sx = (v: number) => pad.left + ((v - tthMin) / (tthMax - tthMin || 1)) * pw;
  const sy = (v: number) => pad.top + ph - ((v - iMin) / (iMax - iMin || 1)) * ph;

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${sx(tth[i]).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");

  // Difference curve offset to bottom
  const diffOffset = iMax * 0.15;

  // Tick marks for axes
  const nTicksX = 8;
  const xTicks = Array.from({ length: nTicksX + 1 }, (_, i) => tthMin + (i / nTicksX) * (tthMax - tthMin));
  const nTicksY = 5;
  const yTicks = Array.from({ length: nTicksY + 1 }, (_, i) => iMin + (i / nTicksY) * (iMax - iMin));

  return (
    <div style={S.plotCanvas}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "100%" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {xTicks.map((v, i) => (
          <line
            key={`gx-${i}`}
            x1={sx(v)} y1={pad.top} x2={sx(v)} y2={pad.top + ph}
            stroke="var(--border-subtle)" strokeWidth={0.5}
          />
        ))}
        {yTicks.map((v, i) => (
          <line
            key={`gy-${i}`}
            x1={pad.left} y1={sy(v)} x2={pad.left + pw} y2={sy(v)}
            stroke="var(--border-subtle)" strokeWidth={0.5}
          />
        ))}

        {/* Background */}
        <path d={toPath(bg)} fill="none" stroke="var(--text-muted)" strokeWidth={1} opacity={0.4} />

        {/* Difference */}
        <path
          d={diff.map((v, i) => `${i === 0 ? "M" : "L"}${sx(tth[i]).toFixed(1)},${sy(v + diffOffset).toFixed(1)}`).join(" ")}
          fill="none" stroke="var(--accent-cyan)" strokeWidth={1} opacity={0.7}
        />

        {/* Calculated */}
        <path d={toPath(calc)} fill="none" stroke="var(--accent-orange)" strokeWidth={1.5} />

        {/* Observed */}
        <path d={toPath(obs)} fill="none" stroke="var(--text-primary)" strokeWidth={1} opacity={0.6} />

        {/* Bragg markers */}
        {braggMarkers?.slice(0, 100).map((bm, i) => {
          const x = sx(bm.two_theta);
          const phaseColors = ["var(--accent-orange)", "var(--accent-cyan)", "var(--accent-emerald)", "var(--accent-violet)"];
          const color = phaseColors[bm.phase_index % phaseColors.length];
          return (
            <line
              key={`bm-${i}`}
              x1={x} y1={pad.top} x2={x} y2={pad.top + 10}
              stroke={color} strokeWidth={1.5} opacity={0.6}
            />
          );
        })}

        {/* X-axis labels */}
        {xTicks.map((v, i) => (
          <text
            key={`xl-${i}`}
            x={sx(v)} y={H - 6}
            textAnchor="middle" fontSize={10}
            fill="var(--text-muted)" fontFamily="var(--font-mono)"
          >
            {v.toFixed(0)}
          </text>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((v, i) => (
          <text
            key={`yl-${i}`}
            x={pad.left - 6} y={sy(v) + 3}
            textAnchor="end" fontSize={9}
            fill="var(--text-muted)" fontFamily="var(--font-mono)"
          >
            {v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}
          </text>
        ))}

        {/* Axis labels */}
        <text
          x={pad.left + pw / 2} y={H - 1}
          textAnchor="middle" fontSize={10} fill="var(--text-tertiary)"
        >
          2-theta (deg)
        </text>
        <text
          x={10} y={pad.top + ph / 2}
          textAnchor="middle" fontSize={10} fill="var(--text-tertiary)"
          transform={`rotate(-90, 10, ${pad.top + ph / 2})`}
        >
          Intensity
        </text>
      </svg>
    </div>
  );
}

// ── ParameterRow component ───────────────────────────────────────────

function ParameterRow({
  param,
  onToggleLock,
  onValueChange,
  changedInLastStep,
}: {
  param: RefinementParameter;
  onToggleLock: () => void;
  onValueChange: (val: number) => void;
  changedInLastStep?: boolean;
}) {
  const [inputVal, setInputVal] = useState(String(param.value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setInputVal(fmt(param.value, 6));
  }, [param.value, editing]);

  const bgColor = param.locked
    ? "transparent"
    : changedInLastStep
    ? "rgba(249, 115, 22, 0.06)"
    : "rgba(16, 185, 129, 0.04)";

  return (
    <div
      style={{
        ...S.paramRow,
        background: bgColor,
      }}
      onMouseEnter={(e) => {
        if (param.locked) e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bgColor;
      }}
    >
      <button
        style={{
          ...S.lockBtn,
          color: param.locked ? "var(--text-muted)" : "var(--success)",
          background: param.locked ? "transparent" : "var(--success-bg)",
        }}
        onClick={onToggleLock}
        title={param.locked ? "Unlock (refine)" : "Lock (fixed)"}
      >
        {param.locked ? <Lock size={12} /> : <Unlock size={12} />}
      </button>

      <span
        style={{
          ...S.paramName,
          color: param.locked ? "var(--text-tertiary)" : "var(--text-primary)",
        }}
        title={param.description}
      >
        {param.label}
      </span>

      <input
        type="text"
        value={inputVal}
        style={{
          ...S.paramInput,
          borderColor: editing ? "var(--border-focus)" : "var(--border-subtle)",
          color: param.locked ? "var(--text-tertiary)" : "var(--text-primary)",
          background: param.locked ? "var(--surface-1)" : "var(--surface-2)",
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          const num = parseFloat(inputVal);
          if (!isNaN(num)) onValueChange(num);
          else setInputVal(fmt(param.value, 6));
        }}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setInputVal(fmt(param.value, 6));
            setEditing(false);
          }
        }}
        disabled={false}
      />

      <span style={S.paramUnc}>
        {param.uncertainty != null ? `±${fmt(param.uncertainty, 4)}` : ""}
      </span>
    </div>
  );
}

// ── CategoryGroup component ──────────────────────────────────────────

function CategoryGroup({
  category,
  params,
  collapsed,
  onToggleCollapse,
  onToggleLock,
  onValueChange,
  changedParams,
  onLockAll,
  onUnlockAll,
}: {
  category: string;
  params: RefinementParameter[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleLock: (name: string) => void;
  onValueChange: (name: string, val: number) => void;
  changedParams: Set<string>;
  onLockAll: () => void;
  onUnlockAll: () => void;
}) {
  const unlockedCount = params.filter((p) => !p.locked).length;
  return (
    <div>
      <div
        style={S.categoryHeader}
        onClick={onToggleCollapse}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        {CATEGORY_ICONS[category] || <Settings2 size={11} />}
        <span style={{ flex: 1 }}>{CATEGORY_LABELS[category] || category}</span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {unlockedCount}/{params.length}
        </span>
      </div>
      {!collapsed && (
        <div>
          <div style={{ display: "flex", gap: 4, padding: "2px 14px 4px" }}>
            <button
              className="button sm ghost"
              style={{ fontSize: 10, height: 20, padding: "0 6px" }}
              onClick={(e) => { e.stopPropagation(); onLockAll(); }}
            >
              Lock All
            </button>
            <button
              className="button sm ghost"
              style={{ fontSize: 10, height: 20, padding: "0 6px" }}
              onClick={(e) => { e.stopPropagation(); onUnlockAll(); }}
            >
              Unlock All
            </button>
          </div>
          {params.map((p) => (
            <ParameterRow
              key={p.name}
              param={p}
              onToggleLock={() => onToggleLock(p.name)}
              onValueChange={(val) => onValueChange(p.name, val)}
              changedInLastStep={changedParams.has(p.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page component ──────────────────────────────────────────────

export default function ManualRefinementPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [experimentId, setExperimentId] = useState("");
  const [phaseInput, setPhaseInput] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [plotHeight, setPlotHeight] = useState(320);
  const [initError, setInitError] = useState<string | null>(null);

  const { session, initMutation, setParamMutation, stepMutation, fullRefinementMutation, undoMutation, resetMutation } =
    useManualRefinement(sessionId);

  const parameters: RefinementParameter[] = session.data?.parameters ?? [];
  const lastResult: RietveldResults | null = (session.data?.last_result as unknown as RietveldResults) ?? null;
  const history = session.data?.history ?? [];
  const currentStep = session.data?.current_step ?? 0;

  const changedParams = useMemo(() => {
    const set = new Set<string>();
    const prev = history.length >= 2 ? history[history.length - 2] : null;
    const curr = history.length >= 1 ? history[history.length - 1] : null;
    if (prev && curr && prev.parameters && curr.parameters) {
      for (const key of Object.keys(curr.parameters)) {
        if (prev.parameters[key] !== curr.parameters[key]) set.add(key);
      }
    }
    return set;
  }, [history]);

  // Group parameters by category
  const groupedParams = useMemo(() => {
    const groups: Record<string, RefinementParameter[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    for (const p of parameters) {
      const cat = p.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    // Remove empty categories
    for (const key of Object.keys(groups)) {
      if (groups[key].length === 0) delete groups[key];
    }
    return groups;
  }, [parameters]);

  const handleInit = useCallback(async () => {
    setInitError(null);
    if (!experimentId.trim()) {
      setInitError("Please enter an experiment ID");
      return;
    }
    try {
      const exp = await apiService.getExperiment(experimentId.trim());
      const cifs: CIFFile[] = exp.cif_files || exp.selected_refinement_phases || [];
      const ttheta = exp.raw_two_theta || [];
      const inten = exp.raw_intensity || [];
      if (ttheta.length === 0) {
        setInitError("No diffraction data found in experiment");
        return;
      }
      if (cifs.length === 0) {
        setInitError("No CIF files/phases found. Run phase identification first.");
        return;
      }
      // Create a temporary session ID, then init via the API
      const tempId = `mr-${Date.now().toString(36)}`;
      const result = await apiService.initManualRefinement({
        experiment_id: experimentId.trim(),
        phase_cifs: cifs,
        wavelength: exp.wavelength_angstrom || 1.5406,
      });
      setSessionId(result.session_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInitError(msg);
    }
  }, [experimentId]);

  const handleToggleLock = useCallback(
    (paramName: string) => {
      if (!sessionId) return;
      const param = parameters.find((p) => p.name === paramName);
      if (!param) return;
      setParamMutation.mutate({ paramName, data: { locked: !param.locked } });
    },
    [sessionId, parameters, setParamMutation],
  );

  const handleValueChange = useCallback(
    (paramName: string, val: number) => {
      if (!sessionId) return;
      setParamMutation.mutate({ paramName, data: { value: val } });
    },
    [sessionId, setParamMutation],
  );

  const handleLockCategory = useCallback(
    (category: string) => {
      if (!sessionId) return;
      const names = parameters.filter((p) => p.category === category).map((p) => p.name);
      if (names.length) setParamMutation.mutate({ paramName: names[0], data: { locked: true } });
      // Batch lock via the lock endpoint (simplified: lock one by one via setParam)
      for (const n of names) setParamMutation.mutate({ paramName: n, data: { locked: true } });
    },
    [sessionId, parameters, setParamMutation],
  );

  const handleUnlockCategory = useCallback(
    (category: string) => {
      if (!sessionId) return;
      const names = parameters.filter((p) => p.category === category).map((p) => p.name);
      for (const n of names) setParamMutation.mutate({ paramName: n, data: { locked: false } });
    },
    [sessionId, parameters, setParamMutation],
  );

  const handleApplyPreset = useCallback(
    (presetName: string) => {
      if (!sessionId) return;
      const presetParams = PRESETS[presetName];
      if (!presetParams) return;
      // Lock all first
      for (const p of parameters) {
        if (!p.locked) setParamMutation.mutate({ paramName: p.name, data: { locked: true } });
      }
      // Unlock preset params
      for (const name of presetParams) {
        const param = parameters.find((p) => p.name === name);
        if (param) setParamMutation.mutate({ paramName: name, data: { locked: false } });
      }
    },
    [sessionId, parameters, setParamMutation],
  );

  const isRunning = stepMutation.isPending || fullRefinementMutation.isPending;

  // Render init form if no session
  if (!sessionId) {
    return (
      <Page
        eyebrow="Rietveld Refinement"
        title="Manual Refinement"
        description="Interactive step-by-step Rietveld refinement with parameter lock/unlock control."
      >
        <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}>
          <div style={S.initOverlay}>
            <FlaskConical size={48} color="var(--accent-orange)" style={{ opacity: 0.8 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              Start Manual Refinement
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.6 }}>
              Enter an experiment ID to begin interactive Rietveld refinement.
              The system will load diffraction data and phase CIFs, then seed
              parameters from an initial auto-refinement.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 }}>
              <input
                type="text"
                placeholder="Experiment ID (e.g. exp-abc123)"
                value={experimentId}
                onChange={(e) => setExperimentId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInit()}
                style={{ height: 38, fontSize: 13 }}
              />
              {initError && (
                <p style={{ fontSize: 12, color: "var(--error)", lineHeight: 1.4 }}>{initError}</p>
              )}
              <button
                className="button primary lg"
                onClick={handleInit}
                disabled={initMutation.isPending}
                style={{ justifyContent: "center" }}
              >
                {initMutation.isPending ? (
                  <><Loader2 size={15} className="spin" /> Initializing...</>
                ) : (
                  <><Play size={15} /> Initialize Session</>
                )}
              </button>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // Render main refinement interface
  return (
    <Page
      eyebrow="Rietveld Refinement"
      title="Manual Refinement"
      description={`Step ${currentStep} · ${parameters.length} parameters · ${parameters.filter((p) => !p.locked).length} unlocked`}
      actions={
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="button ghost sm"
            onClick={() => {
              setSessionId(null);
            }}
          >
            New Session
          </button>
          <button className="button sm">
            <Download size={13} /> Export
          </button>
        </div>
      }
    >
      <div style={S.layout}>
        {/* ── Left Panel: Parameters ── */}
        <div style={S.leftPanel}>
          <div style={S.leftHeader}>
            <div style={S.leftTitle}>
              <Settings2 size={14} color="var(--accent-orange)" />
              Parameters
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {parameters.filter((p) => !p.locked).length} free
              </span>
            </div>
            <div style={S.leftActions}>
              {Object.keys(PRESETS).map((name) => (
                <button
                  key={name}
                  className="button sm ghost"
                  style={{ fontSize: 10, height: 22, padding: "0 8px" }}
                  onClick={() => handleApplyPreset(name)}
                  title={`Apply preset: ${name}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div style={S.paramList}>
            {session.isLoading ? (
              <div style={{ padding: 30, textAlign: "center" }}>
                <Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} />
              </div>
            ) : (
              Object.entries(groupedParams).map(([category, params]) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  params={params}
                  collapsed={collapsedCats.has(category)}
                  onToggleCollapse={() =>
                    setCollapsedCats((prev) => {
                      const next = new Set(prev);
                      if (next.has(category)) next.delete(category);
                      else next.add(category);
                      return next;
                    })
                  }
                  onToggleLock={handleToggleLock}
                  onValueChange={handleValueChange}
                  changedParams={changedParams}
                  onLockAll={() => handleLockCategory(category)}
                  onUnlockAll={() => handleUnlockCategory(category)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel: Plot + Metrics + Controls ── */}
        <div style={S.rightPanel}>
          {/* Metrics Row */}
          <div style={S.metricsRow}>
            {[
              {
                label: "Rwp (%)",
                value: lastResult?.r_wp,
                color: rwpColor(lastResult?.r_wp ?? null),
                sub: "Weighted Profile R-factor",
              },
              {
                label: "Rp (%)",
                value: lastResult?.r_p,
                color: "var(--text-primary)",
                sub: "Profile R-factor",
              },
              {
                label: "GoF",
                value: lastResult?.gof,
                color: gofColor(lastResult?.gof ?? null),
                sub: "Goodness of Fit",
              },
              {
                label: "Chi-squared",
                value: lastResult?.chi_squared,
                color: "var(--accent-cyan)",
                sub: "Reduced chi-squared",
              },
            ].map((m) => (
              <div key={m.label} style={S.metricCard}>
                <div style={S.metricLabel}>{m.label}</div>
                <div style={{ ...S.metricValue, color: m.color }}>{fmt(m.value, m.label === "GoF" ? 3 : 2)}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Diffraction Pattern Plot */}
          <div style={S.plotArea}>
            <div style={S.plotHeader}>
              <span style={S.plotTitle}>
                Observed vs Calculated Pattern
              </span>
              {lastResult?.patterns && (
                <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--text-primary)", borderRadius: 1, opacity: 0.6 }} />
                    Observed
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--accent-orange)", borderRadius: 1 }} />
                    Calculated
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--accent-cyan)", borderRadius: 1 }} />
                    Difference
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--text-muted)", borderRadius: 1, opacity: 0.4 }} />
                    Background
                  </span>
                </div>
              )}
            </div>
            <DiffractionPlot
              patterns={lastResult?.patterns ?? null}
              braggMarkers={lastResult?.bragg_markers ?? []}
              height={plotHeight}
            />
          </div>

          {/* Bottom Controls */}
          <div style={S.bottomBar}>
            <div style={S.controlGroup}>
              <button
                className="button primary"
                onClick={() => stepMutation.mutate()}
                disabled={isRunning || parameters.filter((p) => !p.locked).length === 0}
                title="Run one refinement step with unlocked parameters"
              >
                {stepMutation.isPending ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Play size={14} />
                )}
                Refine Step
              </button>

              <button
                className="button"
                onClick={() => fullRefinementMutation.mutate()}
                disabled={isRunning}
                title="Unlock all parameters and run full refinement"
              >
                {fullRefinementMutation.isPending ? (
                  <Loader2 size={14} className="spin" />
                ) : (
                  <Zap size={14} />
                )}
                Full Refinement
              </button>

              <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />

              <button
                className="button ghost"
                onClick={() => undoMutation.mutate()}
                disabled={isRunning || history.length < 2}
                title="Undo last refinement step"
              >
                <Undo2 size={14} /> Undo
              </button>

              <button
                className="button ghost danger"
                onClick={() => {
                  if (window.confirm("Reset all parameters to initial values?")) {
                    resetMutation.mutate();
                  }
                }}
                disabled={isRunning}
                title="Reset all parameters to initial values"
              >
                <RefreshCw size={14} /> Reset
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={S.stepCounter}>Step {currentStep}</span>
              <div style={S.historyTimeline}>
                {history.map((h, i) => {
                  const isActive = i === history.length - 1;
                  const improved = i > 0 && h.rwp != null && history[i - 1]?.rwp != null && h.rwp < history[i - 1].rwp!;
                  return (
                    <div
                      key={i}
                      style={S.historyDot(isActive, improved)}
                      title={`Step ${h.step}: Rwp=${h.rwp ?? "—"}%`}
                    />
                  );
                })}
                {history.length === 0 && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>No steps yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Phase Info (if available) */}
          {lastResult?.phases_used && lastResult.phases_used.length > 0 && (
            <div
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                padding: "10px 16px",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                Phases
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {lastResult.phases_used.map((phase, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: 11,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: ["var(--accent-orange)", "var(--accent-cyan)", "var(--accent-emerald)", "var(--accent-violet)"][i % 4],
                      }}
                    />
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {phase.formula || phase.name || `Phase ${i + 1}`}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      {((phase.fraction ?? 0) * 100).toFixed(1)}%
                    </span>
                    <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {phase.space_group || ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
