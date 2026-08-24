"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  FileDown,
  Loader2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Page } from "@/components/ui/page";
import { useWorkspaceReport, useWorkspaceReportAiSummary } from "@/hooks/use-api";
import { API_URL } from "@/lib/api-client";
import { techniqueMeta } from "@/components/workspace/workspace";

export default function WorkspaceReportPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { data: report, isLoading, isError } = useWorkspaceReport(projectId);
  const aiSummary = useWorkspaceReportAiSummary(projectId);
  const [aiError, setAiError] = useState<string | null>(null);

  const runAiSummary = async () => {
    setAiError(null);
    try {
      await aiSummary.mutateAsync();
    } catch (err) {
      setAiError(String(err));
    }
  };

  return (
    <Page
      title="Unified Workspace Report"
      description="One report across every instrument in the project — conclusions and AI summary included."
      eyebrow={report?.project.name ?? "Workspace report"}
      actions={
        <a
          className="button"
          href={`${API_URL}/projects/${projectId}/instruments/report/download`}
          style={{ fontSize: 13 }}
        >
          <FileDown size={14} /> Download TXT
        </a>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/workspaces/${projectId}`}
          style={{ fontSize: 13, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={14} /> Workspace
        </Link>
      </div>

      {isLoading ? (
        <Loader2 size={22} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : isError || !report ? (
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
          Could not load the workspace report. Create at least one instrument experiment first.
        </div>
      ) : (
        <div
          style={{
            padding: 20,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          {/* Summary */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 20,
              flexWrap: "wrap",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: 16,
            }}
          >
            {[
              { label: "Experiments", value: report.summary.experiment_count },
              { label: "Analyzed", value: report.summary.analyzed_count },
              { label: "Instruments", value: report.summary.technique_count },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Generated</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {new Date(report.generated_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Per instrument */}
          {report.techniques.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: 24 }}>
              No instrument experiments yet. Open an instrument workspace to get started.
            </div>
          ) : (
            report.techniques.map((tech) => {
              const meta = techniqueMeta(tech.technique);
              const Icon = meta.icon;
              return (
                <div key={tech.technique} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Icon size={18} style={{ color: meta.color }} />
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                      {tech.display_name}
                    </h2>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 10px",
                        borderRadius: 99,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {tech.experiment_count} exp
                    </span>
                  </div>
                  {tech.experiments.map((exp) => (
                    <div
                      key={exp.id}
                      style={{
                        padding: "12px 14px",
                        marginBottom: 8,
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                          {exp.name}
                          {exp.material && (
                            <span
                              style={{
                                fontWeight: 400,
                                color: "var(--text-tertiary)",
                                marginLeft: 8,
                                fontSize: 12,
                              }}
                            >
                              {exp.material}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {exp.status} · {exp.data_points} pts
                        </span>
                      </div>
                      {exp.findings.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12.5,
                            color: "var(--text-secondary)",
                            lineHeight: 1.6,
                          }}
                        >
                          {exp.findings.map((f, i) => (
                            <div key={i}>• {f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* Conclusions + AI Summary */}
          <div
            style={{
              marginTop: 8,
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              Conclusions
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {report.conclusions || "No conclusions available."}
            </p>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              background: "rgba(251, 191, 36, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                AI Summary
              </h3>
              <button
                className="button"
                onClick={runAiSummary}
                disabled={aiSummary.isPending}
                style={{ fontSize: 13 }}
              >
                {aiSummary.isPending && <Loader2 size={14} className="spin" />}
                {aiSummary.data ? <RotateCcw size={14} /> : <Sparkles size={14} />}
                {aiSummary.data ? "Regenerate" : "Generate AI summary"}
              </button>
            </div>
            {aiError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "var(--accent-rose)",
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {aiError}
              </div>
            )}
            {aiSummary.data ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {aiSummary.data.ai_summary}
                </p>
                {aiSummary.data.model && aiSummary.data.model !== "none" && (
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                    {aiSummary.data.model}
                  </span>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Generate a cross-technique AI summary of this report with the AI
                assistant (Groq). It reads the full report above and highlights the
                most significant results across all instruments.
              </p>
            )}
          </div>

          {/* References */}
          <div
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-tertiary)",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
              References
            </h3>
            {report.references && report.references.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.9 }}>
                {report.references.map((ref, i) => (
                  <li key={i}>
                    <strong>{ref.name}</strong>
                    <span style={{ color: "var(--text-tertiary)" }}> — {ref.usage}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No references recorded.</p>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
