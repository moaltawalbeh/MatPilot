"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileDown, Loader2, CheckCircle2 } from "lucide-react";
import {
  useInstrumentExperiments,
  useWorkspaceReport,
} from "@/hooks/use-api";
import type { WorkspaceExperiment } from "@/types";
import { techniqueMeta } from "@/components/workspace/workspace";
import { ExperimentManager } from "@/components/workspace/experiment-manager";
import LibraryPanel from "@/components/workspace/library-panel";

function chips(exp: WorkspaceExperiment): string[] {
  const s = exp.summary ?? {};
  if (exp.technique === "ftir") {
    const groups = (s.functional_groups as Array<{ group?: string }>) ?? [];
    return groups.slice(0, 3).map((g) => g.group ?? "");
  }
  if (exp.technique === "raman") {
    const top = s.top_match as { material?: string; score?: number } | null;
    return top
      ? [`${top.material ?? "?"} (${Math.round(top.score ?? 0)})`]
      : [(s.cosmic_rays_removed as number) > 0 ? `${s.cosmic_rays_removed} cosmic rays` : ""].filter(
          Boolean,
        );
  }
  if (exp.technique === "uvvis") {
    const out: string[] = [];
    if (typeof s.direct_gap_eV === "number") out.push(`Eg dir ${s.direct_gap_eV.toFixed(2)} eV`);
    if (typeof s.indirect_gap_eV === "number") out.push(`Eg ind ${s.indirect_gap_eV.toFixed(2)} eV`);
    return out;
  }
  if (exp.technique === "xrd" && typeof s.peak_count === "number" && s.peak_count > 0) {
    return [`${s.peak_count} peaks`];
  }
  return [];
}

export default function InstrumentWorkspace({
  projectId,
  technique,
}: {
  projectId: string;
  technique: string;
}) {
  const router = useRouter();
  const meta = techniqueMeta(technique);
  const { data: experiments = [], isLoading: loadingExps } = useInstrumentExperiments(
    projectId,
    meta.id,
  );
  const { data: report } = useWorkspaceReport(projectId);

  const stepCount = useMemo(
    () => ({
      total: experiments.length,
      analyzed: experiments.filter((e) => e.has_results).length,
    }),
    [experiments],
  );

  return (
    <div>
      {/* Workflow steps */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {["Create experiment", "Upload files", "Run analysis", "View results"].map((step, i) => (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 99,
              background: i < 3 ? "var(--bg-tertiary)" : "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              fontSize: 12,
              fontWeight: 600,
              color: i < 3 ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 99,
                display: "grid",
                placeItems: "center",
                background: i === 0 ? meta.color : "var(--bg-secondary)",
                color: i === 0 ? "#fff" : "var(--text-muted)",
                fontSize: 10,
              }}
            >
              {i + 1}
            </span>
            {step}
          </div>
        ))}
      </div>

      {/* Counts */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: meta.color }}>
            {stepCount.total}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Experiments</div>
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-emerald)" }}>
            {stepCount.analyzed}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Analyzed</div>
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: report ? "var(--accent-amber)" : "var(--text-muted)",
            }}
          >
            {report?.summary.experiment_count ?? "–"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Workspace total</div>
        </div>
      </div>

      <ExperimentManager
        projectId={projectId}
        technique={meta.id}
        experiments={experiments}
        loading={loadingExps}
        xAxis={meta.xAxis}
        createPrompt={`Create an experiment to analyze a spectrum with the ${meta.name} engine.`}
        chips={chips}
        openLabel="Results"
        onOpen={(exp) =>
          router.push(
            `/workspaces/${projectId}/instruments/${technique}/experiments/${exp.id}`,
          )
        }
      />

      {meta.id !== "xrd" && (
        <div style={{ marginTop: 4 }}>
          <LibraryPanel projectId={projectId} technique={meta.id} />
        </div>
      )}

      {/* Unified report entry */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileDown size={18} style={{ color: "var(--accent-amber)" }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              Unified Workspace Report
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              One report across all instruments ({report?.summary.technique_count ?? 0} techniques,{" "}
              {report?.summary.experiment_count ?? 0} experiments) with conclusions and AI summary.
            </div>
          </div>
        </div>
        <Link className="button" href={`/workspaces/${projectId}/report`} style={{ fontSize: 13 }}>
          <FileDown size={14} /> Open report
        </Link>
      </div>
    </div>
  );
}
