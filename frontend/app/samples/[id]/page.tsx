"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Beaker,
  ArrowUpRight,
  Sparkles,
  Loader2,
  Waves,
  AudioLines,
  Sun,
  Microscope,
  FileBarChart,
  Layers,
  Plus,
  FlaskConical,
} from "lucide-react";
import { Page } from "@/components/ui/page";
import { ErrorDisplay } from "@/components/ui/error-display";
import { Spinner } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { useSample, useMeasurements, useSpectraBySample } from "@/hooks/use-api";
import { API_URL } from "@/lib/api-client";
import { renderMarkdown } from "@/components/spectroscopy/ai-insights-panel";
import { TECHNIQUES } from "@/components/spectroscopy/technique-config";
import type { SpectroscopyTechnique } from "@/types";

const TECHNIQUE_ICONS: Record<string, typeof Waves> = {
  ftir: AudioLines,
  raman: Waves,
  uvvis: Sun,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SampleAiSummary({ sampleName, spectraCount, measurementsCount }: { sampleName: string; spectraCount: number; measurementsCount: number }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Summarize the characterization status of sample "${sampleName}" in MatPilot. It currently has ${spectraCount} spectroscopy spectra and ${measurementsCount} measurements logged. Explain how the user should combine these techniques to fully characterize the material, which complementary techniques to add, and what to look for. Be concise but scientifically accurate.`,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail ?? data?.error?.message ?? `Request failed (${res.status})`);
      setInsight(data?.response ?? "No response received.");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError((err as Error)?.message ?? "Could not generate summary. Check GROQ_API_KEY.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>AI summary</h2>
          <span className="muted">Characterization status and next steps</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {insight ? (
          <>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--text-primary)",
                maxHeight: 360,
                overflowY: "auto",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
            />
            <button className="button ghost" onClick={generate} disabled={loading} style={{ alignSelf: "flex-start" }}>
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              Regenerate
            </button>
          </>
        ) : (
          <>
            {error && (
              <div style={{ fontSize: 12, color: "var(--error)", padding: "8px 12px", borderRadius: "var(--radius-md)", background: "rgba(239, 68, 68, 0.07)", border: "1px solid rgba(239, 68, 68, 0.18)" }}>
                {error}
              </div>
            )}
            <button className="button primary" onClick={generate} disabled={loading} style={{ width: "100%" }}>
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {loading ? "Generating summary…" : "Generate AI summary"}
            </button>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: -6 }}>
              Combines the logged spectra and measurements to suggest next characterization steps.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SampleDetailPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";

  const { data: sample, isLoading, isError, error, refetch } = useSample(id);
  const measurements = useMeasurements({ sample_id: id });
  const spectra = useSpectraBySample(id);

  const allSpectra = spectra.data?.spectra ?? [];
  const allMeasurements = Array.isArray(measurements.data) ? measurements.data : measurements.data?.measurements ?? [];

  const spectraByTechnique = new Map<SpectroscopyTechnique, typeof allSpectra>();
  for (const s of allSpectra) {
    const key = s.technique as SpectroscopyTechnique;
    const arr = spectraByTechnique.get(key) ?? [];
    arr.push(s);
    spectraByTechnique.set(key, arr);
  }

  const tags: string[] = Array.isArray(sample?.tags) ? (sample.tags as string[]) : [];
  const status = (sample as { status?: string } | undefined)?.status ?? "pending";
  const material = (sample as { material?: string } | undefined)?.material ?? "";
  const description = (sample as { description?: string } | undefined)?.description ?? "";

  return (
    <Page
      eyebrow="Sample"
      title={isLoading ? "Loading sample…" : (sample?.name ?? "Sample not found")}
      description={description || (sample ? `Material sample ${sample.name}` : "Manage sample measurements and characterization data.")}
      actions={
        <Link href="/samples" className="button ghost" style={{ textDecoration: "none" }}>
          Back to samples
        </Link>
      }
    >
      {isLoading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner size={24} />
        </div>
      ) : isError ? (
        <ErrorDisplay message={(error as Error)?.message ?? "Failed to load sample."} onRetry={() => refetch()} />
      ) : !sample ? (
        <EmptyState icon={Beaker} title="Sample not found" description="This sample may have been deleted." action={{ label: "View all samples", href: "/samples" }} />
      ) : (
        <>
          {/* Header meta */}
          <div className="card" style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
            <div className="section" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <h2>Overview</h2>
                <span className="muted">Sample metadata</span>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`badge ${status === "active" || status === "ACTIVE" ? "info" : ""}`} style={{ fontSize: 11 }}>
                  {status}
                </span>
                <Link href="/characterization" className="button primary" style={{ textDecoration: "none", fontSize: 13 }}>
                  <Plus size={14} /> Add spectra
                </Link>
              </div>
            </div>
            <div style={{ padding: "0 20px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {[
                { label: "Sample ID", value: sample.id },
                { label: "Material", value: material || "—" },
                { label: "Project", value: (sample as { project_id?: string | null }).project_id ?? "—" },
                { label: "Created", value: sample.created_at?.slice(0, 10) || "—" },
                { label: "Last updated", value: relativeTime(sample.updated_at ?? sample.created_at) },
                {
                  label: "Tags",
                  value: tags.length ? tags.join(", ") : "—",
                },
              ].map((row) => (
                <div key={row.label} style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{row.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 2, wordBreak: "break-word" }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              {/* Spectroscopy */}
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AudioLines size={14} style={{ color: "var(--accent-orange)" }} />
                  <div>
                    <h2>Spectroscopy</h2>
                    <span className="muted">{allSpectra.length} spectra across techniques</span>
                  </div>
                </div>
                <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {spectra.isLoading ? (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Loading spectra…</p>
                  ) : allSpectra.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                        No spectra uploaded for this sample yet. Open an FTIR, Raman or UV-Vis workspace to upload data linked to this sample.
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {TECHNIQUES.map((t) => (
                          <Link key={t.slug} href={`/characterization/${t.slug}?sample_id=${encodeURIComponent(id)}`} className="button" style={{ textDecoration: "none", fontSize: 13 }}>
                            <t.icon size={14} /> {t.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                        {TECHNIQUES.map((t) => {
                          const arr = spectraByTechnique.get(t.slug) ?? [];
                          if (arr.length === 0) return null;
                          const analyzed = arr.filter((s) => s.has_results).length;
                          return (
                            <Link
                              key={t.slug}
                              href={`/characterization/${t.slug}?sample_id=${encodeURIComponent(id)}`}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                                padding: "12px 14px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border-subtle)",
                                background: "var(--surface-1)",
                                textDecoration: "none",
                                transition: "border-color 0.12s ease, box-shadow 0.12s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--border-strong)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--border-subtle)";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <t.icon size={15} style={{ color: t.accentColor }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{t.label}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                {arr.length} spectra · {analyzed} analyzed
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {allSpectra.map((s) => {
                          const Icon = TECHNIQUE_ICONS[s.technique] ?? FileBarChart;
                          const href = `/characterization/${s.technique}?sample_id=${encodeURIComponent(id)}`;
                          return (
                            <Link
                              key={`${s.technique}-${s.id}`}
                              href={href}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: "var(--radius-md)",
                                background: "var(--surface-1)",
                                border: "1px solid var(--border-subtle)",
                                textDecoration: "none",
                                transition: "border-color 0.12s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                            >
                              <Icon size={14} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {s.name || s.filename}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                  {s.technique.toUpperCase()} · {s.data_points} pts · {relativeTime(s.created_at)}
                                </div>
                              </div>
                              {s.has_results && (
                                <span className="badge" style={{ fontSize: 10 }}>
                                  Analyzed
                                </span>
                              )}
                              <ArrowUpRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Measurements */}
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Microscope size={14} style={{ color: "var(--accent-orange)" }} />
                  <div>
                    <h2>Measurements</h2>
                    <span className="muted">{allMeasurements.length} logged for this sample</span>
                  </div>
                </div>
                <div style={{ padding: "0 20px 20px" }}>
                  {measurements.isLoading ? (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Loading measurements…</p>
                  ) : allMeasurements.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                      No measurements yet. Upload spectra or add a measurement to start characterizing this sample.
                    </p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ textAlign: "left", color: "var(--text-tertiary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Type</th>
                            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Name</th>
                            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Status</th>
                            <th style={{ padding: "6px 8px", borderBottom: "1px solid var(--border-subtle)" }}>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allMeasurements.map((m) => {
                            const meta = (m as { metadata?: Record<string, unknown> }).metadata ?? {};
                            const spectrumId = (meta.spectrum_id as string) ?? null;
                            const technique = (meta.technique as string) ?? m.type;
                            const Icon = TECHNIQUE_ICONS[technique] ?? (technique === "xrd" ? FileBarChart : Layers);
                            const href = spectrumId ? `/characterization/${technique}` : "/dashboard";
                            return (
                              <tr key={m.id}>
                                <td style={{ padding: "8px", borderBottom: "1px solid var(--border-faint)" }}>
                                  <Link
                                    href={href}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "inherit" }}
                                  >
                                    <Icon size={13} style={{ color: "var(--accent-orange)" }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{String(technique).toUpperCase()}</span>
                                  </Link>
                                </td>
                                <td style={{ padding: "8px", borderBottom: "1px solid var(--border-faint)", color: "var(--text-primary)" }}>{m.name || "Untitled"}</td>
                                <td style={{ padding: "8px", borderBottom: "1px solid var(--border-faint)" }}>
                                  <span className={`badge ${m.status === "COMPLETED" ? "success" : ""}`} style={{ fontSize: 10 }}>
                                    {m.status}
                                  </span>
                                </td>
                                <td style={{ padding: "8px", borderBottom: "1px solid var(--border-faint)", color: "var(--text-tertiary)" }}>
                                  {relativeTime(m.created_at)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <SampleAiSummary
                sampleName={sample.name}
                spectraCount={allSpectra.length}
                measurementsCount={allMeasurements.length}
              />
              <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FlaskConical size={14} style={{ color: "var(--accent-orange)" }} />
                  <div>
                    <h2>Quick actions</h2>
                    <span className="muted">Characterize this sample further</span>
                  </div>
                </div>
                <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {TECHNIQUES.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/characterization/${t.slug}?sample_id=${encodeURIComponent(id)}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        background: "var(--surface-1)",
                        textDecoration: "none",
                        transition: "border-color 0.12s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                    >
                      <t.icon size={14} style={{ color: t.accentColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Open {t.label} workspace</span>
                      <ArrowUpRight size={13} style={{ color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 }} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
