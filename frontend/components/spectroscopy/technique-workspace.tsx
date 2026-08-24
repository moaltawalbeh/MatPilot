"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { SpectroscopyTechnique, SpectrumAnalysisResult } from "@/types";
import { getTechnique } from "./technique-config";
import type { SpectrumChartSeries } from "./spectrum-chart";
import { SpectrumUploadPanel } from "./upload-panel";
import { SpectrumChart } from "./spectrum-chart";
import { MetadataPanel } from "./metadata-panel";
import { ResultsCards } from "./results-cards";
import { ExportPanel } from "./export-panel";
import { AnalysisSidebar } from "./analysis-sidebar";
import { AiInsightsPanel } from "./ai-insights-panel";
import { HistoryTimeline } from "./history-timeline";
import { ErrorDisplay } from "../ui/error-display";
import { EmptyState } from "../ui/empty-state";
import { Spinner } from "../ui/loading";
import {
  useSpectra,
  useSpectrum,
  useUploadSpectrum,
  useAnalyzeSpectrum,
  useDeleteSpectrum,
} from "@/hooks/use-api";

type TechniqueWorkspaceProps = {
  technique: SpectroscopyTechnique;
  initialSampleId?: string;
};

function baselineLabel(order: number): string {
  if (order <= 0) return "none";
  if (order === 1) return "linear";
  return "polynomial";
}

function baselineOrder(method: string): number {
  if (method === "none") return 0;
  if (method === "linear") return 1;
  return 2;
}

export function TechniqueWorkspace({ technique, initialSampleId }: TechniqueWorkspaceProps) {
  const info = getTechnique(technique);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sampleFilter, setSampleFilter] = useState(initialSampleId ?? "");
  const [smoothing, setSmoothing] = useState(info.defaultWindow);
  const [baselineMethod, setBaselineMethod] = useState(() => baselineLabel(info.defaultBaselineOrder));
  const [prominencePct, setProminencePct] = useState(info.defaultProminencePercent);

  const list = useSpectra(technique, sampleFilter ? { sample_id: sampleFilter } : undefined);
  const detail = useSpectrum(technique, selectedId);
  const upload = useUploadSpectrum(technique);
  const analyze = useAnalyzeSpectrum(technique);
  const remove = useDeleteSpectrum(technique);

  const spectrum = detail.data;
  const analysis: SpectrumAnalysisResult | null = spectrum?.results ?? null;

  const series = useMemo<SpectrumChartSeries[]>(() => {
    if (!spectrum) return [];
    const base: SpectrumChartSeries[] = [
      {
        key: "data",
        data: spectrum.x.map((x, i) => ({ x, y: spectrum.processed_y?.[i] ?? spectrum.y[i] })),
        color: info.accentColor,
        strokeWidth: 1.6,
        opacity: 1,
        label: spectrum.processed_y ? "Corrected" : "Raw intensity",
      },
    ];
    if (spectrum.baseline) {
      base.push({
        key: "baseline",
        data: spectrum.x.map((x, i) => ({ x, y: spectrum.baseline?.[i] ?? 0 })),
        color: "var(--text-muted)",
        strokeWidth: 1,
        dash: "4 3",
        opacity: 0.7,
        label: "Baseline",
      });
    }
    return base;
  }, [spectrum, info.accentColor]);

  const peaks = useMemo(() => spectrum?.peaks ?? [], [spectrum?.peaks]);

  const bandAssignments = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of peaks) {
      if (p.assignment) map[String(p.position)] = p.assignment;
    }
    return map;
  }, [peaks]);

  const handleUpload = async (file: File, sid?: string) => {
    const res = await upload.mutateAsync({ file, sample_id: sid });
    return { id: res.spectrum.id, sample_id: res.spectrum.sample_id };
  };

  const handleUploaded = (id: string) => {
    setSelectedId(id);
    list.refetch();
  };

  const handleAnalyze = async () => {
    if (!spectrum) return;
    const span = Math.max(...spectrum.y) - Math.min(...spectrum.y) || 1;
    await analyze.mutateAsync({
      id: spectrum.id,
      data: {
        window: smoothing,
        baseline_order: baselineOrder(baselineMethod),
        prominence: Math.max((prominencePct / 100) * span, 1e-9),
      },
    });
  };

  const handleDelete = async () => {
    if (!spectrum) return;
    await remove.mutateAsync(spectrum.id);
    setSelectedId(null);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(280px, 320px) minmax(0, 1fr) minmax(280px, 320px)",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* ── Left rail: upload + library ─────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <SpectrumUploadPanel
          technique={technique}
          accept={info.formats.join(",")}
          formats={info.formats.map((f) => f.replace(".", ""))}
          sampleId={initialSampleId}
          onUploaded={handleUploaded}
          onUpload={handleUpload}
        />

        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              <h2>Library</h2>
              <span className="muted">{list.data?.total ?? 0} spectra stored</span>
            </div>
            {list.isLoading && <Spinner size={14} />}
          </div>
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="text"
              value={sampleFilter}
              onChange={(e) => setSampleFilter(e.target.value)}
              placeholder="Filter by sample ID"
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
            {list.isLoading ? (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Loading spectra…</p>
            ) : list.error ? (
              <p style={{ fontSize: 12, color: "var(--error)" }}>{(list.error as Error)?.message}</p>
            ) : (list.data?.spectra.length ?? 0) === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                No spectra yet. Upload a file above to get started.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 420, overflowY: "auto" }}>
                {list.data?.spectra.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        background: active ? "var(--accent-orange-bg)" : "var(--surface-1)",
                        border: active ? "1px solid var(--accent-orange)" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {item.has_results ? (
                          <CheckCircle2 size={13} style={{ color: "var(--success, #22c55e)", flexShrink: 0 }} />
                        ) : (
                          <Circle size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name || item.filename}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 19 }}>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {new Date(item.created_at).toLocaleDateString()} · {item.data_points} pts
                        </span>
                        {item.sample_id && (
                          <span className="badge" style={{ fontSize: 10 }}>
                            {item.sample_id}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Center: spectrum detail ─────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {!selectedId ? (
          <EmptyState
            icon={info.icon}
            title={`No ${info.label} spectrum selected`}
            description={`Upload a file or pick one from the library to view the spectrum, run peak analysis and generate AI insights.`}
          />
        ) : detail.isLoading ? (
          <div className="card" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Spinner size={24} />
          </div>
        ) : detail.isError ? (
          <ErrorDisplay message={(detail.error as Error)?.message ?? "Failed to load spectrum."} onRetry={() => detail.refetch()} />
        ) : spectrum ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: info.bgColor,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <info.icon size={18} style={{ color: info.accentColor }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{spectrum.name || spectrum.filename}</h1>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {info.label} · {spectrum.filename} · {spectrum.data_points} points
                  {spectrum.sample_id ? ` · sample ${spectrum.sample_id}` : ""}
                </p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                {spectrum.has_results && (
                  <span className="badge success" style={{ fontSize: 11 }}>
                    Analyzed
                  </span>
                )}
              </div>
            </div>

            <SpectrumChart
              series={series}
              peaks={peaks}
              xAxisLabel={info.xAxisLabel}
              yAxisLabel={info.yAxisLabel}
              title={info.displayName}
              emptyTitle="No data"
              emptyDescription="This spectrum has no points to display."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
              <MetadataPanel
                metadata={spectrum.metadata}
                filename={spectrum.filename}
                dataPoints={spectrum.data_points}
                xRange={spectrum.x_range}
                xAxisLabel={info.xAxisLabel}
              />
              <ExportPanel technique={technique} spectrumId={spectrum.id} filename={spectrum.filename} />
            </div>

            {analysis ? (
              <ResultsCards
                analysis={analysis}
                bandAssignments={bandAssignments}
                baselineMethod={baselineLabel(analysis.parameters.baseline_order)}
                smoothingWindow={analysis.parameters.window}
              />
            ) : (
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px dashed var(--border-default)",
                  background: "var(--surface-1)",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                No analysis yet. Use the <strong>Analysis</strong> panel on the right to detect peaks, or run the
                default parameters.
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ── Right rail: analysis + AI + history ─────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <AnalysisSidebar
          smoothingWindow={smoothing}
          onSmoothingWindow={setSmoothing}
          baselineMethod={baselineMethod}
          onBaselineMethod={setBaselineMethod}
          prominence={prominencePct}
          onProminence={setProminencePct}
          defaultProminence={info.defaultProminencePercent}
          onRun={handleAnalyze}
          running={analyze.isPending}
          isAnalyzed={Boolean(spectrum?.has_results)}
        />
        <AiInsightsPanel
          technique={technique}
          analysis={analysis}
          filename={spectrum?.filename}
          disabled={!selectedId}
        />
        <HistoryTimeline history={spectrum?.history ?? []} onDelete={handleDelete} deleting={remove.isPending} />
      </div>
    </div>
  );
}
