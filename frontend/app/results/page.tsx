"use client";

import { Page } from "@/components/ui/page";
import { useProjects } from "@/hooks/use-api";
import { apiService } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { BarChart3, Loader2, ChevronRight, FlaskConical, Target } from "lucide-react";
import Link from "next/link";

type ExperimentResult = {
  id: string;
  name: string;
  status: string;
  data_points: number;
  detected_peaks: unknown[];
  candidate_phases: unknown[];
  rietveld_results: {
    r_wp?: number;
    r_p?: number;
    r_exp?: number;
    chi_squared?: number;
    gof?: number;
    patterns?: unknown;
  } | null;
};

export default function ResultsPage() {
  const { data: projects, isLoading } = useProjects();
  const allProjects = projects ?? [];
  const [experiments, setExperiments] = useState<ExperimentResult[]>([]);
  const [loadingExps, setLoadingExps] = useState(true);

  useEffect(() => {
    async function loadAllExperiments() {
      setLoadingExps(true);
      const allExps: ExperimentResult[] = [];
      for (const project of allProjects) {
        try {
          const exps = await apiService.listProjectExperiments(project.id) as unknown as ExperimentResult[];
          if (exps) allExps.push(...exps);
        } catch { /* skip */ }
      }
      setExperiments(allExps);
      setLoadingExps(false);
    }
    if (allProjects.length > 0) {
      loadAllExperiments();
    } else {
      setLoadingExps(false);
    }
  }, [allProjects.length]);

  const expsWithPhases = experiments.filter((e) => e.candidate_phases?.length > 0);
  const expsWithRietveld = experiments.filter((e) => e.rietveld_results);
  const bestRietveld = expsWithRietveld.length > 0
    ? expsWithRietveld.reduce((best, e) => (!best.rietveld_results || (e.rietveld_results?.gof ?? 999) < (best.rietveld_results.gof ?? 999)) ? e : best, expsWithRietveld[0])
    : null;
  const bestRv = bestRietveld?.rietveld_results;

  return (
    <Page
      eyebrow="Scientific output"
      title="Results"
      description="View phase identification results, refinement statistics, and analysis outputs."
    >
      {/* Summary Cards */}
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {[
          { label: "Projects", value: String(allProjects.length), sub: "Total", color: "var(--accent-orange)" },
          { label: "Experiments", value: String(experiments.length), sub: `${experiments.filter((e) => e.status === "Refined").length} refined`, color: "var(--accent-cyan)" },
          { label: "Phases Found", value: String(expsWithPhases.length), sub: "experiments", color: "var(--accent-emerald)" },
          { label: "R_wp", value: bestRv?.r_wp != null ? `${bestRv.r_wp.toFixed(2)}%` : "—", sub: bestRietveld ? bestRietveld.name : "No refinements yet", color: "var(--accent-violet)" },
        ].map((m) => (
          <div className="card" key={m.label} style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>{m.label}</div>
            <div className="number" style={{ color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid two">
        {/* Phase Identification Results */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Phase Identification</h2>
              <span className="muted">Candidate phases from COD search</span>
            </div>
          </div>
          {isLoading || loadingExps ? (
            <div style={{ padding: 30, textAlign: "center" }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : expsWithPhases.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <FlaskConical size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.4 }} />
              <p className="muted" style={{ fontSize: 13, maxWidth: 280, margin: "0 auto" }}>
                No results yet. Run phase identification on an experiment to see candidates here.
              </p>
            </div>
          ) : (
            <div style={{ padding: "0 20px 12px" }}>
              {expsWithPhases.slice(0, 6).map((exp) => {
                const topPhase = exp.candidate_phases[0] as Record<string, string | number> | undefined;
                const phaseName = (topPhase?.material_name as string) || "Unknown";
                const phaseFormula = (topPhase?.material_formula as string) || "?";
                const phaseConfidence = (topPhase?.confidence as string) || "";
                return (
                  <div key={exp.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{exp.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {phaseName} ({phaseFormula})
                      {phaseConfidence && <span className="badge info" style={{ marginLeft: 6, fontSize: 10 }}>{phaseConfidence}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Refinement Results */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Rietveld Refinement</h2>
              <span className="muted">Refinement statistics and quality metrics</span>
            </div>
          </div>
          {loadingExps ? (
            <div style={{ padding: 30, textAlign: "center" }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : expsWithRietveld.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <Target size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.4 }} />
              <p className="muted" style={{ fontSize: 13, maxWidth: 280, margin: "0 auto" }}>
                Complete a Rietveld refinement to view statistics here.
              </p>
            </div>
          ) : (
            <div style={{ padding: "0 20px 12px" }}>
              {expsWithRietveld.slice(0, 6).map((exp) => {
                const rv = exp.rietveld_results!;
                return (
                  <div key={exp.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{exp.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                      <span>R<sub>wp</sub>: {rv.r_wp?.toFixed(2) ?? "—"}%</span>
                      <span>GoF: {rv.gof?.toFixed(3) ?? "—"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Refinement Statistics */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="section">
          <div>
            <h2>Refinement Statistics</h2>
            <span className="muted">{bestRietveld ? `Best result: ${bestRietveld.name}` : "Quality indicators from completed refinements"}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "8px 20px 20px" }}>
          {[
            { label: "R_wp", desc: "Weighted profile R-factor", value: bestRv?.r_wp != null ? `${bestRv.r_wp.toFixed(2)}%` : "—" },
            { label: "χ²", desc: "Reduced chi-squared", value: bestRv?.chi_squared?.toFixed(3) ?? "—" },
            { label: "GoF", desc: "Goodness of fit", value: bestRv?.gof?.toFixed(3) ?? "—" },
            { label: "R_p", desc: "Profile R-factor", value: bestRv?.r_p != null ? `${bestRv.r_p.toFixed(2)}%` : "—" },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent-orange)", letterSpacing: "-0.3px" }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
