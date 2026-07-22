"use client";

import { useState, useMemo, useCallback, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Page } from "@/components/ui/page";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useManualRefinement, useRefinementParameters } from "@/hooks/use-api";
import { apiService } from "@/lib/api-client";
import type { RefinementParameter, ManualRefinementSession, CIFFile, RietveldResults } from "@/types";
import {
  Play, RotateCcw, Undo2, Lock, Unlock, ChevronDown, ChevronRight,
  Settings2, Layers, FlaskConical, Loader2, Download, Zap, Target,
  TrendingDown, BarChart3, RefreshCw, Eye, EyeOff, Copy, ArrowLeft,
  CheckCircle2, AlertTriangle, CircleDot, Square, Trash2, Info,
} from "lucide-react";

// ── Category Config ──────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "scale", "background", "profile", "instrument", "lattice", "phase", "sample", "microstructure",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  scale: "Scale & Zero",
  background: "Background",
  profile: "Peak Profile",
  instrument: "Instrument",
  lattice: "Lattice Parameters",
  phase: "Phase Fractions",
  sample: "Preferred Orientation",
  microstructure: "Microstructure",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  scale: <Target size={12} />,
  background: <Layers size={12} />,
  profile: <BarChart3 size={12} />,
  instrument: <Settings2 size={12} />,
  lattice: <FlaskConical size={12} />,
  phase: <Copy size={12} />,
  sample: <RefreshCw size={12} />,
  microstructure: <Zap size={12} />,
};

// ── Presets ──────────────────────────────────────────────────────────

const PRESETS: { label: string; params: string[] }[] = [
  { label: "Background First", params: ["bg_c0", "bg_c1", "bg_c2", "bg_c3", "bg_c4", "bg_c5", "scale", "zero_shift"] },
  { label: "Profile Shape", params: ["U", "V", "W", "eta"] },
  { label: "Standard", params: ["scale", "zero_shift", "bg_c0", "bg_c1", "bg_c2", "bg_c3", "U", "V", "W", "eta"] },
  { label: "Lattice Only", params: ["lattice_a", "lattice_b", "lattice_c", "lattice_alpha", "lattice_beta", "lattice_gamma"] },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 4): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(decimals);
}

function fmtPct(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "—";
  return val.toFixed(2);
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

function chiColor(chi: number | null): string {
  if (chi == null) return "var(--text-muted)";
  if (Math.abs(chi - 1) < 0.5) return "var(--success)";
  if (Math.abs(chi - 1) < 1.5) return "var(--accent-amber)";
  return "var(--error)";
}

type RefinementStatus = "idle" | "running" | "converged" | "diverged";

function deriveStatus(
  isRunning: boolean,
  gof: number | null,
  step: number,
): RefinementStatus {
  if (isRunning) return "running";
  if (step === 0) return "idle";
  if (gof != null && gof > 3) return "diverged";
  if (gof != null && gof > 0.8 && gof < 1.5) return "converged";
  return "idle";
}

const STATUS_CONFIG: Record<RefinementStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  idle: { label: "Idle", color: "var(--text-muted)", bg: "var(--surface-2)", icon: <CircleDot size={11} /> },
  running: { label: "Running", color: "var(--accent-orange)", bg: "rgba(249,115,22,0.1)", icon: <Loader2 size={11} className="spin" /> },
  converged: { label: "Converged", color: "var(--success)", bg: "rgba(16,185,129,0.1)", icon: <CheckCircle2 size={11} /> },
  diverged: { label: "Diverged", color: "var(--error)", bg: "rgba(239,68,68,0.1)", icon: <AlertTriangle size={11} /> },
};

// ── Styles ───────────────────────────────────────────────────────────

const S = {
  mainLayout: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    height: "calc(100vh - 180px)",
    minHeight: 640,
  },
  threeColGrid: {
    display: "grid",
    gridTemplateColumns: "380px 1fr 320px",
    gap: 10,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  panelBase: {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  leftPanel: {
    gridTemplateColumns: undefined,
  },
  leftHeader: {
    padding: "12px 14px 10px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    flexShrink: 0,
  },
  leftTitle: {
    fontSize: 12,
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
    padding: "2px 0",
  },
  categoryHeader: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "9px 14px 5px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.7px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    cursor: "pointer",
    userSelect: "none" as const,
    transition: "color 0.1s",
  },
  catActions: {
    display: "flex",
    gap: 3,
    padding: "2px 14px 3px",
  },
  paramRow: {
    display: "grid",
    gridTemplateColumns: "26px 1fr 78px 48px",
    alignItems: "center",
    gap: 3,
    padding: "4px 12px 4px 8px",
    fontSize: 12,
    transition: "background 0.1s ease",
    cursor: "default",
  },
  paramBoundsRow: {
    display: "grid",
    gridTemplateColumns: "26px 1fr 1fr",
    alignItems: "center",
    gap: 3,
    padding: "2px 12px 4px 34px",
    fontSize: 10,
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
    transition: "all 0.15s ease",
    color: "var(--text-tertiary)",
    padding: 0,
  },
  paramName: {
    fontSize: 11.5,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  paramInput: {
    width: "100%",
    height: 24,
    fontSize: 11,
    padding: "0 5px",
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
  boundsInput: {
    width: "100%",
    height: 22,
    fontSize: 10,
    padding: "0 4px",
    borderRadius: "var(--radius-xs)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-2)",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    textAlign: "right" as const,
    outline: "none",
  },
  boundsLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.3px",
  },
  centerPanel: {
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  chartHeader: {
    padding: "10px 16px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  chartBody: {
    flex: 1,
    position: "relative" as const,
    overflow: "hidden",
    minHeight: 0,
  },
  rightPanel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    overflow: "hidden",
    padding: 12,
  },
  metricCard: {
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    padding: "10px 12px",
    textAlign: "center" as const,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    letterSpacing: "-0.5px",
  },
  metricSub: {
    fontSize: 8.5,
    color: "var(--text-muted)",
    marginTop: 1,
  },
  statusBadge: (status: RefinementStatus) => {
    const cfg = STATUS_CONFIG[status];
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "5px 10px",
      borderRadius: "var(--radius-sm)",
      background: cfg.bg,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 600,
    };
  },
  phaseItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 8px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  bottomPanel: {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    overflow: "hidden",
    maxHeight: 180,
  },
  logHeader: {
    padding: "8px 14px",
    borderBottom: "1px solid var(--border-subtle)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-primary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  logTable: {
    width: "100%",
    fontSize: 11,
    borderCollapse: "collapse" as const,
  },
  logTh: {
    padding: "6px 12px",
    textAlign: "left" as const,
    fontSize: 9.5,
    fontWeight: 600,
    letterSpacing: "0.4px",
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-subtle)",
    background: "var(--surface-2)",
    position: "sticky" as const,
    top: 0,
  },
  logTd: {
    padding: "5px 12px",
    fontFamily: "var(--font-mono)",
    color: "var(--text-primary)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  actionBar: {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-1)",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexShrink: 0,
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
  historyDot: (active: boolean, improved: boolean) => ({
    width: active ? 10 : 7,
    height: active ? 10 : 7,
    borderRadius: "50%",
    background: active ? "var(--accent-orange)" : improved ? "var(--success)" : "var(--surface-4)",
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
    gap: 14,
    padding: 40,
    textAlign: "center" as const,
  },
  divider: {
    width: 1,
    height: 20,
    background: "var(--border-subtle)",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 8,
    padding: 30,
  },
};

// ── ParameterRow Component ───────────────────────────────────────────

function ParameterRow({
  param,
  showBounds,
  onToggleLock,
  onValueChange,
  onBoundsChange,
  changedInLastStep,
}: {
  param: RefinementParameter;
  showBounds: boolean;
  onToggleLock: () => void;
  onValueChange: (val: number) => void;
  onBoundsChange: (lower: number, upper: number) => void;
  changedInLastStep?: boolean;
}) {
  const [inputVal, setInputVal] = useState(fmt(param.value, 6));
  const [lowerVal, setLowerVal] = useState(fmt(param.lower_bound, 4));
  const [upperVal, setUpperVal] = useState(fmt(param.upper_bound, 4));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setInputVal(fmt(param.value, 6));
  }, [param.value, editing]);

  useEffect(() => {
    setLowerVal(fmt(param.lower_bound, 4));
    setUpperVal(fmt(param.upper_bound, 4));
  }, [param.lower_bound, param.upper_bound]);

  const bgColor = param.locked
    ? "transparent"
    : changedInLastStep
    ? "rgba(249,115,22,0.06)"
    : "rgba(16,185,129,0.04)";

  const isModified = param.initial_value !== param.value;

  return (
    <div>
      <div
        style={{ ...S.paramRow, background: bgColor }}
        onMouseEnter={(e) => { if (param.locked) e.currentTarget.style.background = "var(--bg-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = bgColor; }}
      >
        <button
          style={{
            ...S.lockBtn,
            color: param.locked ? "var(--text-muted)" : "var(--success)",
            background: param.locked ? "transparent" : "var(--success-bg)",
          }}
          onClick={onToggleLock}
          title={param.locked ? "Unlock (will be refined)" : "Lock (fixed)"}
        >
          {param.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>

        <span
          style={{
            ...S.paramName,
            color: param.locked ? "var(--text-tertiary)" : "var(--text-primary)",
          }}
          title={param.description}
        >
          {param.label}
          {isModified && (
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--accent-orange)",
                marginLeft: 4,
                verticalAlign: "middle",
                position: "relative",
                top: -1,
              }}
              title="Modified from initial value"
            />
          )}
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
              (e.target as HTMLInputElement).blur();
            }
          }}
        />

        <span style={S.paramUnc}>
          {param.uncertainty != null ? `±${fmt(param.uncertainty, 4)}` : ""}
        </span>
      </div>

      {showBounds && (
        <div style={S.paramBoundsRow}>
          <span />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.boundsLabel}>min</span>
            <input
              type="text"
              value={lowerVal}
              style={S.boundsInput}
              onBlur={() => {
                const num = parseFloat(lowerVal);
                if (!isNaN(num)) onBoundsChange(num, param.upper_bound);
                else setLowerVal(fmt(param.lower_bound, 4));
              }}
              onChange={(e) => setLowerVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.boundsLabel}>max</span>
            <input
              type="text"
              value={upperVal}
              style={S.boundsInput}
              onBlur={() => {
                const num = parseFloat(upperVal);
                if (!isNaN(num)) onBoundsChange(param.lower_bound, num);
                else setUpperVal(fmt(param.upper_bound, 4));
              }}
              onChange={(e) => setUpperVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── CategorySection Component ────────────────────────────────────────

function CategorySection({
  category,
  params,
  collapsed,
  showBounds,
  onToggleCollapse,
  onToggleLock,
  onValueChange,
  onBoundsChange,
  changedParams,
  onLockAll,
  onUnlockAll,
}: {
  category: string;
  params: RefinementParameter[];
  collapsed: boolean;
  showBounds: boolean;
  onToggleCollapse: () => void;
  onToggleLock: (name: string) => void;
  onValueChange: (name: string, val: number) => void;
  onBoundsChange: (name: string, lower: number, upper: number) => void;
  changedParams: Set<string>;
  onLockAll: () => void;
  onUnlockAll: () => void;
}) {
  const unlockedCount = params.filter((p) => !p.locked).length;
  return (
    <div>
      <div style={S.categoryHeader} onClick={onToggleCollapse}>
        {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        {CATEGORY_ICONS[category] || <Settings2 size={11} />}
        <span style={{ flex: 1 }}>{CATEGORY_LABELS[category] || category}</span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {unlockedCount}/{params.length}
        </span>
      </div>
      {!collapsed && (
        <div>
          <div style={S.catActions}>
            <button
              className="button sm ghost"
              style={{ fontSize: 9, height: 18, padding: "0 5px" }}
              onClick={(e) => { e.stopPropagation(); onLockAll(); }}
            >
              Lock All
            </button>
            <button
              className="button sm ghost"
              style={{ fontSize: 9, height: 18, padding: "0 5px" }}
              onClick={(e) => { e.stopPropagation(); onUnlockAll(); }}
            >
              Unlock All
            </button>
          </div>
          {params.map((p) => (
            <ParameterRow
              key={p.name}
              param={p}
              showBounds={showBounds}
              onToggleLock={() => onToggleLock(p.name)}
              onValueChange={(val) => onValueChange(p.name, val)}
              onBoundsChange={(lower, upper) => onBoundsChange(p.name, lower, upper)}
              changedInLastStep={changedParams.has(p.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Init Screen ──────────────────────────────────────────────────────

function InitScreen({
  experimentId,
  setExperimentId,
  onInit,
  isPending,
  error,
}: {
  experimentId: string;
  setExperimentId: (v: string) => void;
  onInit: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <Page
      eyebrow="Rietveld Refinement"
      title="Manual Refinement"
      description="Interactive step-by-step Rietveld refinement with full parameter control."
    >
      <div className="card" style={{ maxWidth: 560, margin: "40px auto" }}>
        <div style={S.initOverlay}>
          <FlaskConical size={48} color="var(--accent-orange)" style={{ opacity: 0.8 }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            Start Manual Refinement
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, lineHeight: 1.6 }}>
            Enter an experiment ID to begin interactive Rietveld refinement.
            The system will load diffraction data, phase CIFs, and seed
            parameters from an initial auto-refinement.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 }}>
            <input
              type="text"
              placeholder="Experiment ID (e.g. exp-abc123)"
              value={experimentId}
              onChange={(e) => setExperimentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onInit()}
              style={{ height: 38, fontSize: 13 }}
            />
            {error && (
              <p style={{ fontSize: 12, color: "var(--error)", lineHeight: 1.4 }}>{error}</p>
            )}
            <button
              className="button primary lg"
              onClick={onInit}
              disabled={isPending}
              style={{ justifyContent: "center" }}
            >
              {isPending ? (
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

// ── Main Page Content ────────────────────────────────────────────────

function ManualRefinementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experimentIdParam = searchParams.get("experiment") || "";

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [experimentInput, setExperimentInput] = useState(experimentIdParam);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [showBounds, setShowBounds] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const {
    session,
    initMutation,
    setParamMutation,
    lockMutation,
    unlockMutation,
    stepMutation,
    fullRefinementMutation,
    undoMutation,
    resetMutation,
    deleteMutation,
  } = useManualRefinement(sessionId);

  const { data: paramDefs } = useRefinementParameters();

  const parameters: RefinementParameter[] = session.data?.parameters ?? [];
  const lastResult: RietveldResults | null = (session.data?.last_result as unknown as RietveldResults) ?? null;
  const history = session.data?.history ?? [];
  const currentStep = session.data?.current_step ?? 0;

  const isRunning = stepMutation.isPending || fullRefinementMutation.isPending;
  const status = deriveStatus(isRunning, lastResult?.gof ?? null, currentStep);

  const changedParams = useMemo(() => {
    const set = new Set<string>();
    if (history.length < 2) return set;
    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    if (prev?.parameters && curr?.parameters) {
      for (const key of Object.keys(curr.parameters)) {
        if (prev.parameters[key] !== curr.parameters[key]) set.add(key);
      }
    }
    return set;
  }, [history]);

  const groupedParams = useMemo(() => {
    const groups: Record<string, RefinementParameter[]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    for (const p of parameters) {
      const cat = p.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    for (const key of Object.keys(groups)) {
      if (groups[key].length === 0) delete groups[key];
    }
    return groups;
  }, [parameters]);

  const chartData = useMemo(() => {
    if (!lastResult?.patterns) return [];
    const p = lastResult.patterns;
    return p.two_theta.map((angle, i) => ({
      angle,
      Experimental: p.observed[i],
      Calculated: p.calculated[i],
      Difference: p.difference[i],
      Background: p.background[i],
    }));
  }, [lastResult?.patterns]);

  const braggPeaks = useMemo(() => {
    if (!lastResult?.bragg_markers) return [];
    return lastResult.bragg_markers.slice(0, 200).map((bm) => ({
      two_theta: bm.two_theta,
      intensity: bm.intensity,
      hkl: bm.hkl,
    }));
  }, [lastResult?.bragg_markers]);

  const unlockedCount = parameters.filter((p) => !p.locked).length;

  useEffect(() => {
    if (experimentIdParam && !experimentInput) {
      setExperimentInput(experimentIdParam);
    }
  }, [experimentIdParam]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history.length]);

  const handleInit = useCallback(async () => {
    setInitError(null);
    if (!experimentInput.trim()) {
      setInitError("Please enter an experiment ID");
      return;
    }
    try {
      const exp = await apiService.getExperiment(experimentInput.trim());
      const cifs: CIFFile[] = exp.cif_files || exp.selected_refinement_phases || [];
      const ttheta = exp.raw_two_theta || [];
      if (ttheta.length === 0) {
        setInitError("No diffraction data found in experiment");
        return;
      }
      if (cifs.length === 0) {
        setInitError("No CIF files found. Run phase identification first.");
        return;
      }
      const result = await apiService.initManualRefinement({
        experiment_id: experimentInput.trim(),
        phase_cifs: cifs,
        wavelength: exp.wavelength_angstrom || 1.5406,
      });
      setSessionId(result.session_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInitError(msg);
    }
  }, [experimentInput]);

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

  const handleBoundsChange = useCallback(
    (paramName: string, lower: number, upper: number) => {
      if (!sessionId) return;
      setParamMutation.mutate({ paramName, data: { value: parameters.find((p) => p.name === paramName)?.value, locked: parameters.find((p) => p.name === paramName)?.locked } });
    },
    [sessionId, parameters, setParamMutation],
  );

  const handleLockCategory = useCallback(
    (category: string) => {
      if (!sessionId) return;
      const names = parameters.filter((p) => p.category === category).map((p) => p.name);
      if (names.length) lockMutation.mutate(names);
    },
    [sessionId, parameters, lockMutation],
  );

  const handleUnlockCategory = useCallback(
    (category: string) => {
      if (!sessionId) return;
      const names = parameters.filter((p) => p.category === category).map((p) => p.name);
      if (names.length) unlockMutation.mutate(names);
    },
    [sessionId, parameters, unlockMutation],
  );

  const handleLockAll = useCallback(() => {
    if (!sessionId) return;
    const names = parameters.filter((p) => !p.locked).map((p) => p.name);
    if (names.length) lockMutation.mutate(names);
  }, [sessionId, parameters, lockMutation]);

  const handleUnlockAll = useCallback(() => {
    if (!sessionId) return;
    const names = parameters.filter((p) => p.locked).map((p) => p.name);
    if (names.length) unlockMutation.mutate(names);
  }, [sessionId, parameters, unlockMutation]);

  const handleApplyPreset = useCallback(
    (presetParams: string[]) => {
      if (!sessionId) return;
      const toLock = parameters.map((p) => p.name);
      const toUnlock = presetParams.filter((name) => parameters.some((p) => p.name === name));
      if (toLock.length) lockMutation.mutate(toLock);
      setTimeout(() => {
        if (toUnlock.length) unlockMutation.mutate(toUnlock);
      }, 100);
    },
    [sessionId, parameters, lockMutation, unlockMutation],
  );

  if (!sessionId) {
    return (
      <InitScreen
        experimentId={experimentInput}
        setExperimentId={setExperimentInput}
        onInit={handleInit}
        isPending={initMutation.isPending}
        error={initError}
      />
    );
  }

  const statusCfg = STATUS_CONFIG[status];

  return (
    <Page
      eyebrow="Rietveld Refinement"
      title="Manual Refinement"
      description={`Step ${currentStep} · ${parameters.length} parameters · ${unlockedCount} free`}
      actions={
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            className="button ghost sm"
            onClick={() => router.back()}
          >
            <ArrowLeft size={13} /> Back
          </button>
          <button
            className="button ghost sm"
            onClick={() => { setSessionId(null); }}
          >
            New Session
          </button>
        </div>
      }
    >
      <div style={S.mainLayout}>
        {/* ── Three-Column Grid ── */}
        <div style={S.threeColGrid}>

          {/* ── Left Panel: Parameters ── */}
          <div style={{ ...S.panelBase, overflow: "hidden" }}>
            <div style={S.leftHeader}>
              <div style={S.leftTitle}>
                <Settings2 size={13} color="var(--accent-orange)" />
                Parameters
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {unlockedCount} free
                </span>
              </div>
              <div style={S.leftActions}>
                <button
                  className="button sm ghost"
                  style={{ fontSize: 10, height: 20, padding: "0 6px" }}
                  onClick={handleLockAll}
                  title="Lock all parameters"
                >
                  <Lock size={10} /> Lock All
                </button>
                <button
                  className="button sm ghost"
                  style={{ fontSize: 10, height: 20, padding: "0 6px" }}
                  onClick={handleUnlockAll}
                  title="Unlock all parameters"
                >
                  <Unlock size={10} /> Unlock All
                </button>
                <button
                  className="button sm ghost"
                  style={{
                    fontSize: 10,
                    height: 20,
                    padding: "0 6px",
                    color: showBounds ? "var(--accent-orange)" : undefined,
                  }}
                  onClick={() => setShowBounds(!showBounds)}
                  title="Show/hide min/max bounds"
                >
                  {showBounds ? <EyeOff size={10} /> : <Eye size={10} />} Bounds
                </button>
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="button sm ghost"
                    style={{ fontSize: 9, height: 19, padding: "0 6px" }}
                    onClick={() => handleApplyPreset(preset.params)}
                    title={`Apply preset: ${preset.label}`}
                  >
                    {preset.label}
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
                  <CategorySection
                    key={category}
                    category={category}
                    params={params}
                    collapsed={collapsedCats.has(category)}
                    showBounds={showBounds}
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
                    onBoundsChange={handleBoundsChange}
                    changedParams={changedParams}
                    onLockAll={() => handleLockCategory(category)}
                    onUnlockAll={() => handleUnlockCategory(category)}
                  />
                ))
              )}
              {Object.keys(groupedParams).length === 0 && !session.isLoading && (
                <div style={S.emptyState}>
                  <Info size={24} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No parameters available</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Center Panel: Diffraction Chart ── */}
          <div style={{ ...S.panelBase, overflow: "hidden" }}>
            <div style={S.chartHeader}>
              <span style={S.chartTitle}>Diffraction Pattern</span>
              {chartData.length > 0 && (
                <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--accent-orange)", borderRadius: 1 }} />
                    Observed
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--success)", borderRadius: 1 }} />
                    Calculated
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--text-muted)", borderRadius: 1 }} />
                    Difference
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: "var(--accent-violet)", borderRadius: 1 }} />
                    Background
                  </span>
                </div>
              )}
            </div>
            <div style={S.chartBody}>
              {chartData.length > 0 ? (
                <XrdChart
                  data={chartData}
                  theoreticalPeaks={braggPeaks}
                  title=""
                  emptyTitle="No pattern data"
                  emptyDescription="Run a refinement step to see the diffraction pattern"
                />
              ) : (
                <div style={S.emptyState}>
                  <BarChart3 size={36} color="var(--text-muted)" style={{ opacity: 0.25 }} />
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    Run a refinement step to visualize the pattern
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Statistics & Status ── */}
          <div style={{ ...S.panelBase, overflow: "hidden" }}>
            <div style={S.rightPanel}>
              {/* Status Badge */}
              <div style={S.statusBadge(status)}>
                {statusCfg.icon}
                {statusCfg.label}
              </div>

              {/* Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Rwp", value: lastResult?.r_wp, unit: "%", color: rwpColor(lastResult?.r_wp ?? null), format: fmtPct },
                  { label: "Rp", value: lastResult?.r_p, unit: "%", color: "var(--text-primary)", format: fmtPct },
                  { label: "Rexp", value: lastResult?.r_exp, unit: "%", color: "var(--text-primary)", format: fmtPct },
                  { label: "GoF", value: lastResult?.gof, unit: "", color: gofColor(lastResult?.gof ?? null), format: (v: number | null) => fmt(v, 3) },
                  { label: "Chi²", value: lastResult?.chi_squared, unit: "", color: chiColor(lastResult?.chi_squared ?? null), format: (v: number | null) => fmt(v, 3) },
                  { label: "Step", value: currentStep, unit: "", color: "var(--accent-orange)", format: (v: number | null) => String(v ?? 0) },
                ].map((m) => (
                  <div key={m.label} style={S.metricCard}>
                    <div style={S.metricLabel}>{m.label}</div>
                    <div style={{ ...S.metricValue, color: m.color, fontSize: 18 }}>
                      {m.format(m.value)}
                      {m.unit && <span style={{ fontSize: 11, fontWeight: 400 }}>{m.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Phase List */}
              {lastResult?.phases_used && lastResult.phases_used.length > 0 && (
                <div>
                  <div style={S.sectionTitle}>Phases</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {lastResult.phases_used.map((phase, i) => (
                      <div key={i} style={S.phaseItem}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: ["var(--accent-orange)", "var(--accent-cyan)", "var(--success)", "var(--accent-violet)"][i % 4],
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                            {phase.formula || phase.name || `Phase ${i + 1}`}
                          </div>
                          <div style={{ fontSize: 9.5, color: "var(--text-muted)" }}>
                            {phase.space_group || ""}
                          </div>
                        </div>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>
                          {((phase.fraction ?? 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Iteration Info */}
              {lastResult && (
                <div>
                  <div style={S.sectionTitle}>Last Result</div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    <div>{lastResult.message || "—"}</div>
                    {lastResult.iterations != null && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        Converged in {lastResult.iterations} inner iterations
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Panel: Iteration Log ── */}
        <div style={S.bottomPanel}>
          <div style={S.logHeader}>
            <BarChart3 size={13} />
            Iteration Log
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {history.length} steps
            </span>
          </div>
          <div style={{ maxHeight: 130, overflowY: "auto" }}>
            {history.length > 0 ? (
              <table style={S.logTable}>
                <thead>
                  <tr>
                    <th style={S.logTh}>Step</th>
                    <th style={{ ...S.logTh, textAlign: "right" }}>Rwp (%)</th>
                    <th style={{ ...S.logTh, textAlign: "right" }}>Rp (%)</th>
                    <th style={S.logTh}>Action</th>
                    <th style={S.logTh}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const isLast = i === history.length - 1;
                    const improved = i > 0 && h.rwp != null && history[i - 1]?.rwp != null && h.rwp < history[i - 1].rwp!;
                    return (
                      <tr
                        key={i}
                        style={{
                          background: isLast ? "rgba(249,115,22,0.04)" : "transparent",
                        }}
                      >
                        <td style={{ ...S.logTd, fontWeight: isLast ? 600 : 400 }}>
                          {h.step}
                        </td>
                        <td style={{ ...S.logTd, textAlign: "right", color: rwpColor(h.rwp) }}>
                          {h.rwp != null ? h.rwp.toFixed(2) : "—"}
                        </td>
                        <td style={{ ...S.logTd, textAlign: "right" }}>
                          {h.rp != null ? h.rp.toFixed(2) : "—"}
                        </td>
                        <td style={{ ...S.logTd, fontFamily: "system-ui", fontSize: 10 }}>
                          {h.action || "—"}
                        </td>
                        <td style={S.logTd}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: improved ? "var(--success)" : h.rwp != null && i > 0 && history[i - 1]?.rwp != null && h.rwp > history[i - 1].rwp! ? "var(--error)" : "var(--text-muted)",
                              marginRight: 4,
                            }}
                          />
                          {improved ? "Improved" : "Applied"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr ref={logEndRef as React.RefObject<HTMLTableRowElement>} />
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                No refinement steps yet. Click &quot;Run Step&quot; to begin.
              </div>
            )}
          </div>
        </div>

        {/* ── Action Bar ── */}
        <div style={S.actionBar}>
          <div style={S.controlGroup}>
            <button
              className="button primary"
              onClick={() => stepMutation.mutate()}
              disabled={isRunning || unlockedCount === 0}
              title="Run one refinement step with unlocked parameters"
            >
              {stepMutation.isPending ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Play size={14} />
              )}
              Run Step
            </button>

            <button
              className="button"
              onClick={() => fullRefinementMutation.mutate()}
              disabled={isRunning}
              title="Run full auto-refinement"
            >
              {fullRefinementMutation.isPending ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Zap size={14} />
              )}
              Full Auto
            </button>

            <div style={S.divider} />

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

            <button
              className="button ghost danger"
              onClick={() => {
                if (window.confirm("Delete this refinement session permanently?")) {
                  deleteMutation.mutate(undefined, {
                    onSuccess: () => setSessionId(null),
                  });
                }
              }}
              disabled={isRunning}
              title="Delete this refinement session"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={S.stepCounter}>Step {currentStep}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
              {history.map((h, i) => {
                const isActive = i === history.length - 1;
                const improved = i > 0 && h.rwp != null && history[i - 1]?.rwp != null && h.rwp < history[i - 1].rwp!;
                return (
                  <div
                    key={i}
                    style={S.historyDot(isActive, improved)}
                    title={`Step ${h.step}: Rwp=${h.rwp != null ? h.rwp.toFixed(2) : "—"}%`}
                  />
                );
              })}
              {history.length === 0 && (
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>No steps yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

// ── Exported Page with Suspense Boundary ─────────────────────────────

export default function ManualRefinementPage() {
  return (
    <Suspense
      fallback={
        <Page
          eyebrow="Rietveld Refinement"
          title="Manual Refinement"
          description="Loading..."
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <Loader2 size={28} className="spin" style={{ color: "var(--text-muted)" }} />
          </div>
        </Page>
      }
    >
      <ManualRefinementContent />
    </Suspense>
  );
}
