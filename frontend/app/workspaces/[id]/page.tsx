"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  FileBarChart,
  AudioLines,
  Waves,
  Sun,
  Clock,
  ChevronRight,
  FlaskConical,
  FileText,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useProject, useInstruments, useInstrumentExperiments } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import type { InstrumentTechnique, WorkspaceExperiment } from "@/types";

const INSTRUMENTS = [
  { id: "xrd", name: "XRD", full: "X-ray Diffraction", icon: FileBarChart, color: "var(--accent-orange)" },
  { id: "ftir", name: "FTIR", full: "FTIR Spectroscopy", icon: AudioLines, color: "var(--accent-emerald)" },
  { id: "raman", name: "Raman", full: "Raman Spectroscopy", icon: Waves, color: "var(--accent-cyan)" },
  { id: "uvvis", name: "UV-Vis", full: "UV-Vis Spectroscopy", icon: Sun, color: "var(--accent-amber)" },
] as const;

const TABS = [
  { id: "overview", label: "Overview" },
  ...INSTRUMENTS.map((i) => ({ id: i.id, label: i.name })),
  { id: "reports", label: "Reports" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const { data: workspace, isLoading: workspaceLoading } = useProject(id);
  const { data: instruments } = useInstruments(id);

  const { data: xrdExps = [], isLoading: xrdLoading } = useInstrumentExperiments(id, "xrd");
  const { data: ftirExps = [], isLoading: ftirLoading } = useInstrumentExperiments(id, "ftir");
  const { data: ramanExps = [], isLoading: ramanLoading } = useInstrumentExperiments(id, "raman");
  const { data: uvvisExps = [], isLoading: uvvisLoading } = useInstrumentExperiments(id, "uvvis");

  const experimentsByTechnique = useMemo(() => ({
    xrd: xrdExps,
    ftir: ftirExps,
    raman: ramanExps,
    uvvis: uvvisExps,
  }), [xrdExps, ftirExps, ramanExps, uvvisExps]);

  const instrumentSummaries = useMemo(() => {
    if (!instruments) return [];
    return INSTRUMENTS.map((inst) => {
      const summary = instruments.find(
        (s: { technique: string }) => s.technique === inst.id,
      );
      return {
        ...inst,
        experimentCount: summary?.experiment_count ?? 0,
        analyzedCount: summary?.analyzed_count ?? 0,
        dataCount: summary?.data_count ?? 0,
      };
    });
  }, [instruments]);

  const allExperiments = useMemo(
    () => [...xrdExps, ...ftirExps, ...ramanExps, ...uvvisExps],
    [xrdExps, ftirExps, ramanExps, uvvisExps],
  );

  const isLoading = workspaceLoading || xrdLoading || ftirLoading || ramanLoading || uvvisLoading;

  if (isLoading && !workspace) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="skeleton" style={{ width: 200, height: 24, margin: "0 auto 12px" }} />
        <div className="skeleton" style={{ width: 300, height: 16, margin: "0 auto" }} />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
        <AlertCircle size={32} style={{ marginBottom: 12, color: "var(--text-muted)" }} />
        <p>Workspace not found.</p>
        <Link href="/dashboard" style={{ fontSize: 13, color: "var(--accent-orange)", marginTop: 8, display: "inline-block" }}>
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "12px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-tertiary)" }}>
          <Link
            href="/dashboard"
            style={{ color: "var(--text-tertiary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            My Workspaces
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{workspace.name}</span>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            fontSize: 13,
            color: "var(--text-tertiary)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> All workspaces
        </Link>

        {/* Workspace info */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
            {workspace.name}
          </h1>
          {workspace.material && (
            <span
              className="badge"
              style={{ marginRight: 8, background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: 12 }}
            >
              {workspace.material}
            </span>
          )}
          {workspace.description && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "8px 0 0", lineHeight: 1.5 }}>
              {workspace.description}
            </p>
          )}
        </div>

        {/* Instrument stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 28,
          }}
        >
          {instrumentSummaries.map((inst) => {
            const Icon = inst.icon;
            return (
              <button
                key={inst.id}
                onClick={() => setActiveTab(inst.id as TabId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid var(--border-subtle)`,
                  background: activeTab === inst.id ? "var(--bg-tertiary)" : "var(--surface-1)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = inst.color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-tertiary)",
                    display: "grid",
                    placeItems: "center",
                    color: inst.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{inst.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {inst.experimentCount} experiment{inst.experimentCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20, display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tabs ${activeTab === tab.id ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent-orange)" : "2px solid transparent",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "overview" && (
            <OverviewTab
              instrumentSummaries={instrumentSummaries}
              experiments={allExperiments}
              onSelectInstrument={(id) => setActiveTab(id as TabId)}
            />
          )}

          {INSTRUMENTS.map((inst) =>
            activeTab === inst.id ? (
              <InstrumentTab
                key={inst.id}
                instrument={inst}
                experiments={experimentsByTechnique[inst.id as InstrumentTechnique] ?? []}
                workspaceId={id}
              />
            ) : null,
          )}

          {activeTab === "reports" && (
            <ReportsTab workspaceId={id} workspaceName={workspace.name} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────────────── */

function OverviewTab({
  instrumentSummaries,
  experiments,
  onSelectInstrument,
}: {
  instrumentSummaries: Array<{
    id: string;
    name: string;
    full: string;
    icon: typeof FileBarChart;
    color: string;
    experimentCount: number;
    analyzedCount: number;
    dataCount: number;
  }>;
  experiments: WorkspaceExperiment[];
  onSelectInstrument: (id: string) => void;
}) {
  const totalExperiments = experiments.length;
  const totalAnalyzed = experiments.filter((e) => e.has_results).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Total Experiments</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{totalExperiments}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>Analyzed</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-emerald)" }}>{totalAnalyzed}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
        Instrument Summaries
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {instrumentSummaries.map((inst) => {
          const Icon = inst.icon;
          return (
            <button
              key={inst.id}
              onClick={() => onSelectInstrument(inst.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 16,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = inst.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Icon size={16} style={{ color: inst.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{inst.full}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                {inst.experimentCount} experiment{inst.experimentCount !== 1 ? "s" : ""} &middot;{" "}
                {inst.analyzedCount} analyzed &middot;{" "}
                {inst.dataCount} data point{inst.dataCount !== 1 ? "s" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Instrument Tab ───────────────────────────────────────────── */

function InstrumentTab({
  instrument,
  experiments,
  workspaceId,
}: {
  instrument: (typeof INSTRUMENTS)[number];
  experiments: WorkspaceExperiment[];
  workspaceId: string;
}) {
  const Icon = instrument.icon;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={18} style={{ color: instrument.color }} />
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            {instrument.full}
          </h2>
        </div>
        <Link
          href={`/workspaces/${workspaceId}/instruments/${instrument.id}`}
          className="button primary"
          style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> New Batch
        </Link>
      </div>

      {experiments.length === 0 ? (
        <div
          style={{
            border: "2px dashed var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <FlaskConical size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px" }}>
            No {instrument.name} experiments yet. Create your first batch to get started.
          </p>
          <Link
            href={`/workspaces/${workspaceId}/instruments/${instrument.id}`}
            className="button primary"
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={14} /> New Batch
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {experiments.map((exp) => (
            <Link
              key={exp.id}
              href={`/workspaces/${workspaceId}/instruments/${instrument.id}/experiments/${exp.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                textDecoration: "none",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = instrument.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                  {exp.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Clock size={12} />
                  {new Date(exp.created_at).toLocaleDateString()}
                  <span>&middot;</span>
                  {exp.data_points} data point{exp.data_points !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {exp.has_results && (
                  <span className="badge good" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <FileText size={11} /> Analyzed
                  </span>
                )}
                <span
                  className="badge"
                  style={{
                    fontSize: 11,
                    background: exp.status === "completed" ? "var(--accent-emerald)" : "var(--bg-tertiary)",
                    color: exp.status === "completed" ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {exp.status}
                </span>
                <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reports Tab ──────────────────────────────────────────────── */

function ReportsTab({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <FileText size={18} style={{ color: "var(--text-tertiary)" }} />
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Workspace Reports
        </h2>
      </div>
      <Link
        href={`/workspaces/${workspaceId}/report`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "16px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
          textDecoration: "none",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-orange)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
        }}
      >
        <FileText size={20} style={{ color: "var(--accent-orange)" }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Unified Report — {workspaceName}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Generate a comprehensive report across all instruments.
          </div>
        </div>
        <ChevronRight size={16} style={{ marginLeft: "auto", color: "var(--text-muted)" }} />
      </Link>
    </div>
  );
}
