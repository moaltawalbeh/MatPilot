"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertTriangle,
  Target,
  Activity,
  ExternalLink,
  Crosshair,
} from "lucide-react";
import { useInstrumentExperiments, useGetInstrumentExperiment } from "@/hooks/use-api";
import type { InstrumentTechnique, WorkspaceExperimentDetail } from "@/types";
import { techniqueMeta } from "@/components/workspace/workspace";
import SpectrumPlot, {
  type PeakMarker,
  type SpectrumRegion,
} from "@/components/workspace/spectrum-plot";
import AiInterpretation from "@/components/workspace/ai-interpretation";

type R = Record<string, any>;

function useExperimentDetail(projectId: string, technique: InstrumentTechnique, eid: string | null) {
  return useGetInstrumentExperiment(projectId, technique, eid);
}

/* ── FTIR ─────────────────────────────────────────────────────────── */

function FtirResults({ projectId, detail, name }: { projectId: string; detail: WorkspaceExperimentDetail; name: string }) {
  const r: R = detail.analysis_results ?? {};
  const groups: R[] = r.functional_groups ?? [];
  const peaks: R[] = r.peaks ?? [];
  const deconv: R = r.deconvolution ?? {};
  const corrected: number[] = r.corrected ?? detail.y ?? [];

  const regions: SpectrumRegion[] = useMemo(() => {
    const fg = (detail.analysis_results as R | null)?.functional_groups ?? [];
    return fg
      .filter((g: R) => Array.isArray(g.band_range) && g.band_range.length === 2)
      .map((g: R) => ({ from: g.band_range[0], to: g.band_range[1], label: g.group }));
  }, [detail]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SpectrumPlot
        x={detail.x}
        y={corrected}
        xLabel="Wavenumber (cm⁻¹)"
        yLabel="Absorbance"
        color="var(--accent-emerald)"
        height={300}
        peaks={peaks.map((p) => ({ position: p.position }))}
        regions={regions}
      />

      {groups.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Functional Group Assignments
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.map((g, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 99,
                    background: "var(--accent-emerald)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{g.group}</span>
                {g.mode && <span style={{ color: "var(--text-tertiary)" }}>{g.mode}</span>}
                {Array.isArray(g.band_range) && (
                  <span style={{ color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                    {g.band_range[0]}–{g.band_range[1]} cm⁻¹
                  </span>
                )}
                <span style={{ color: "var(--text-tertiary)" }}>
                  {g.peaks?.length ? `${g.peaks.length} band(s)` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {peaks.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            overflowX: "auto",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Detected Bands ({peaks.length})
          </h3>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-tertiary)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Position (cm⁻¹)</th>
                <th style={{ padding: "6px 8px" }}>Intensity</th>
                <th style={{ padding: "6px 8px" }}>FWHM</th>
                <th style={{ padding: "6px 8px" }}>Group</th>
                <th style={{ padding: "6px 8px" }}>Mode</th>
              </tr>
            </thead>
            <tbody>
              {peaks.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.position}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>
                    {Number(p.intensity).toExponential(2)}
                  </td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.fwhm}</td>
                  <td style={{ padding: "6px 8px", color: "var(--accent-emerald)" }}>{p.group ?? "–"}</td>
                  <td style={{ padding: "6px 8px", color: "var(--text-tertiary)" }}>{p.mode ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deconv.applied && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Peak Deconvolution
          </h3>
          {deconv.regions.map((region: R, i: number) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Region {region.range?.[0]}–{region.range?.[1]} cm⁻¹ · {region.n_components} components
                {typeof region.r_squared === "number" && ` · R² = ${region.r_squared}`}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {region.components.map((c: R, j: number) => (
                  <div
                    key={j}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {c.position} cm⁻¹
                    <span style={{ color: "var(--text-tertiary)" }}>
                      {" "}· FWHM {c.fwhm}
                    </span>
                    {c.assignment && (
                      <div style={{ color: "var(--accent-emerald)", fontSize: 11 }}>
                        {c.assignment.group}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Raman ────────────────────────────────────────────────────────── */

function RamanResults({ projectId, detail, name }: { projectId: string; detail: WorkspaceExperimentDetail; name: string }) {
  const r: R = detail.analysis_results ?? {};
  const corrected: number[] = r.corrected ?? detail.y ?? [];
  const peaks: R[] = r.peaks ?? [];
  const cosmic: R = r.cosmic_rays ?? {};
  const removed: R[] = cosmic.removed ?? [];
  const matches: R[] = (r.matching?.matches ?? []).slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SpectrumPlot
        x={detail.x}
        y={corrected}
        xLabel="Raman shift (cm⁻¹)"
        yLabel="Intensity"
        color="var(--accent-cyan)"
        height={300}
        peaks={peaks.map((p) => ({ position: p.position }))}
        annotations={removed.map((c) => ({ position: c.x_value, label: "cosmic ray" }))}
      />

      {matches.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Material Identification
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {matches.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: 10,
                  borderRadius: "var(--radius-md)",
                  background: i === 0 ? "rgba(56, 189, 248, 0.06)" : "var(--bg-tertiary)",
                  border: i === 0 ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: i === 0 ? "var(--accent-cyan)" : "var(--bg-secondary)",
                      color: i === 0 ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {m.score?.toFixed?.(0) ?? m.score}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {m.material}
                  </span>
                  {m.formula && (
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                      {m.formula}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    confidence {m.confidence}
                  </span>
                </div>
                {m.matched_bands?.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                    Matched bands:{" "}
                    {m.matched_bands
                      .map((b: R) => `${b.detected} cm⁻¹ (ref ${b.reference})`)
                      .join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {removed.length > 0 && (
        <div
          style={{
            padding: 12,
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            background: "rgba(244, 63, 94, 0.06)",
            fontSize: 13,
            color: "var(--accent-rose)",
          }}
        >
          <Crosshair size={14} style={{ marginRight: 8, verticalAlign: -2 }} />
          {removed.length} cosmic ray spike{removed.length !== 1 ? "s" : ""} removed
          {typeof cosmic.threshold_sigma === "number" && ` (threshold ${cosmic.threshold_sigma}σ)`}
        </div>
      )}

      {peaks.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            overflowX: "auto",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Fitted Lorentzian Bands ({peaks.length})
          </h3>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-tertiary)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Shift (cm⁻¹)</th>
                <th style={{ padding: "6px 8px" }}>Intensity</th>
                <th style={{ padding: "6px 8px" }}>FWHM</th>
                <th style={{ padding: "6px 8px" }}>Area</th>
                <th style={{ padding: "6px 8px" }}>Line shape</th>
              </tr>
            </thead>
            <tbody>
              {peaks.map((p, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.position}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>
                    {Number(p.intensity).toExponential(2)}
                  </td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.fwhm}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.area}</td>
                  <td style={{ padding: "6px 8px", color: "var(--text-tertiary)" }}>{p.line_shape}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── UV-Vis ───────────────────────────────────────────────────────── */

function UvVisResults({ projectId, detail, name }: { projectId: string; detail: WorkspaceExperimentDetail; name: string }) {
  const r: R = detail.analysis_results ?? {};
  const [tab, setTab] = useState<"spectrum" | "tauc">("spectrum");
  const absorbance: number[] = r.absorbance ?? detail.y ?? [];
  const km: R = r.kubelka_munk ?? {};
  const tauc: R = r.tauc ?? {};
  const energy: number[] = tauc.energy_eV ?? [];
  const directY: number[] = tauc.direct?.y ?? [];
  const indirectY: number[] = tauc.indirect?.y ?? [];
  const directGap: R = tauc.direct?.band_gap ?? null;
  const indirectGap: R = tauc.indirect?.band_gap ?? null;
  const transitions: R[] = r.transitions ?? [];
  const isReflectance = !!r.is_reflectance;

  const taucData = useMemo(() => {
    const taucRes = (detail.analysis_results as R | null)?.tauc ?? {};
    const energy: number[] = taucRes.energy_eV ?? [];
    const directY: number[] = taucRes.direct?.y ?? [];
    const indirectY: number[] = taucRes.indirect?.y ?? [];
    const n = Math.min(energy.length, directY.length, indirectY.length);
    const out: Array<{ e: number; direct: number | null; indirect: number | null }> = [];
    for (let i = 0; i < n; i += 1) {
      out.push({
        e: energy[i],
        direct: directY[i] ?? null,
        indirect: indirectY[i] ?? null,
      });
    }
    return out;
  }, [detail]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: 99,
            background: isReflectance ? "var(--bg-tertiary)" : "var(--accent-amber)",
            color: isReflectance ? "var(--text-secondary)" : "#fff",
          }}
        >
          Mode: {r.mode ?? "absorbance"}
        </span>
        {km.applied && (
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Kubelka-Munk transform applied: F(R) = (1-R)²/2R
          </span>
        )}
        {tauc.thickness_micron && (
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            thickness {tauc.thickness_micron} μm · α proxy = {tauc.alpha_proxy}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {(["spectrum", "tauc"] as const).map((t) => (
          <button
            key={t}
            className="button"
            onClick={() => setTab(t)}
            style={{
              fontSize: 13,
              color: tab === t ? "var(--accent-amber)" : undefined,
              borderColor: tab === t ? "var(--accent-amber)" : undefined,
            }}
          >
            {t === "spectrum" ? "Absorbance spectrum" : "Tauc plots"}
          </button>
        ))}
      </div>

      {tab === "spectrum" ? (
        <SpectrumPlot
          x={detail.x}
          y={absorbance}
          xLabel="Wavelength (nm)"
          yLabel={isReflectance ? "F(R)" : "Absorbance"}
          color="var(--accent-amber)"
          height={300}
          peaks={(r.peaks ?? []).map((p: R) => ({ position: p.position_nm }))}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Direct allowed (αhν)²
            </h3>
            <TaucMiniChart data={taucData} mode="direct" gap={directGap} color="var(--accent-amber)" />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Indirect allowed (αhν)^½
            </h3>
            <TaucMiniChart data={taucData} mode="indirect" gap={indirectGap} color="var(--accent-emerald)" />
          </div>
        </div>
      )}

      {/* Band gap cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <BandGapCard label="Direct band gap" gap={directGap} color="var(--accent-amber)" />
        <BandGapCard label="Indirect band gap" gap={indirectGap} color="var(--accent-emerald)" />
      </div>

      {transitions.length > 0 && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            overflowX: "auto",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            Optical Transitions
          </h3>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--text-tertiary)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Transition</th>
                <th style={{ padding: "6px 8px" }}>Region</th>
                <th style={{ padding: "6px 8px" }}>Peaks (nm)</th>
                <th style={{ padding: "6px 8px" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "6px 8px", color: "var(--accent-amber)" }}>{t.transition}</td>
                  <td style={{ padding: "6px 8px", color: "var(--text-tertiary)" }}>{t.region}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>
                    {(t.peaks ?? []).map((p: R) => p.position_nm).join(", ")}
                  </td>
                  <td style={{ padding: "6px 8px", color: "var(--text-tertiary)" }}>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaucMiniChart({
  data,
  mode,
  gap,
  color,
}: {
  data: Array<{ e: number; direct: number | null; indirect: number | null }>;
  mode: "direct" | "indirect";
  gap: R | null;
  color: string;
}) {
  const points = useMemo(() => {
    const out: Array<{ x: number; y: number }> = [];
    for (const d of data) {
      const v = mode === "direct" ? d.direct : d.indirect;
      if (v === null || v === undefined) continue;
      out.push({ x: d.e, y: v });
    }
    return out;
  }, [data, mode]);

  return (
    <SpectrumPlot
      x={points.map((p) => p.x)}
      y={points.map((p) => p.y)}
      xLabel="Photon energy (eV)"
      yLabel={mode === "direct" ? "(αhν)²" : "(αhν)^½"}
      color={color}
      height={240}
      peaks={gap ? [{ position: gap.band_gap_eV }] : []}
    />
  );
}

function BandGapCard({ label, gap, color }: { label: string; gap: R | null; color: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        padding: "14px 16px",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-secondary)",
        border: `1px solid ${gap ? "var(--border-subtle)" : "var(--border-subtle)"}`,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</div>
      {gap ? (
        <>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{gap.band_gap_eV} eV</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            onset {gap.onset_eV} eV · edge start {gap.edge_start_eV} eV
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          Not resolvable from this spectrum
        </div>
      )}
    </div>
  );
}

/* ── XRD ──────────────────────────────────────────────────────────── */

function XrdResults({ projectId, detail, name }: { projectId: string; detail: WorkspaceExperimentDetail; name: string }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <Target size={20} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            XRD Scientific Pipeline
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            XRD analysis runs through the dedicated scientific pipeline: phase
            identification, Rietveld refinement, peak indexing and crystal structure.
          </p>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
        Status: {detail.status} · {detail.data_points} data points
        {detail.x_range ? ` · 2θ ${detail.x_range[0].toFixed(1)}–${detail.x_range[1].toFixed(1)}` : ""}
      </div>
      <Link
        className="button primary"
        href={`/projects/${projectId}/experiments/${detail.id}`}
        style={{ fontSize: 13 }}
      >
        <ExternalLink size={14} /> Open in XRD Studio
      </Link>
    </div>
  );
}

/* ── Dispatcher ───────────────────────────────────────────────────── */

export default function ExperimentResults({
  projectId,
  technique,
  eid,
}: {
  projectId: string;
  technique: string;
  eid: string;
}) {
  const meta = techniqueMeta(technique);
  const { data: detail, isLoading, isError, error } = useExperimentDetail(projectId, meta.id, eid);

  if (isLoading) {
    return <Loader2 size={22} className="spin" style={{ color: "var(--text-muted)" }} />;
  }
  if (isError || !detail) {
    return (
      <div
        style={{
          padding: "24px 20px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          background: "rgba(239, 68, 68, 0.06)",
          color: "var(--accent-rose)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <AlertTriangle size={18} />
        {error instanceof Error ? error.message : "Failed to load experiment results."}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>
          <Activity size={12} style={{ verticalAlign: -2 }} /> {detail.status}
          {detail.has_results ? " · analysis complete" : " · not analyzed"}
        </div>
        {detail.has_results && meta.id === "ftir" && (
          <FtirResults projectId={projectId} detail={detail} name={detail.name} />
        )}
        {detail.has_results && meta.id === "raman" && (
          <RamanResults projectId={projectId} detail={detail} name={detail.name} />
        )}
        {detail.has_results && meta.id === "uvvis" && (
          <UvVisResults projectId={projectId} detail={detail} name={detail.name} />
        )}
        {meta.id === "xrd" && <XrdResults projectId={projectId} detail={detail} name={detail.name} />}
        {!detail.has_results && meta.id !== "xrd" && (
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            This experiment has data but no results yet. Run the analysis engine from the
            instrument workspace.
          </div>
        )}
      </div>

      {meta.id !== "xrd" && (
        <AiInterpretation
          projectId={projectId}
          technique={meta.id}
          experimentId={detail.id}
          name={detail.name}
        />
      )}
    </div>
  );
}
