"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileDown, Loader2, FlaskConical } from "lucide-react";
import { Page } from "@/components/ui/page";
import { useProject, useWorkspaceReport } from "@/hooks/use-api";
import { WORKSPACE_TECHNIQUES } from "@/components/workspace/workspace";

export default function WorkspaceHub() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const { data: project, isLoading } = useProject(projectId);
  const { data: report } = useWorkspaceReport(projectId);

  return (
    <Page
      title="Workspace"
      description="Choose an instrument to start a characterization workflow."
      eyebrow={project?.name ?? "Project workspace"}
      actions={
        <Link
          className="button"
          href={`/workspaces/${projectId}/report`}
          style={{ fontSize: 13 }}
        >
          <FileDown size={14} /> Unified Report
        </Link>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/projects/${projectId}`}
          style={{ fontSize: 13, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={14} /> Back to project
        </Link>
      </div>

      {report && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          {report.summary.experiment_count} experiment
          {report.summary.experiment_count !== 1 ? "s" : ""} across{" "}
          {report.summary.technique_count} instrument
          {report.summary.technique_count !== 1 ? "s" : ""} (
          {report.summary.analyzed_count} analyzed)
        </div>
      )}

      {isLoading ? (
        <Loader2 size={22} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {WORKSPACE_TECHNIQUES.map((t) => {
            const count = report?.techniques.find((x) => x.technique === t.id)?.experiment_count ?? 0;
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={`/workspaces/${projectId}/instruments/${t.id}`}
                style={{
                  textDecoration: "none",
                  padding: 18,
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-secondary)",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = t.color)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)")
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-tertiary)",
                      display: "grid",
                      placeItems: "center",
                      color: t.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {count} experiment{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>
                  {t.description}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {t.capabilities.slice(0, 5).map((cap) => (
                    <span
                      key={cap}
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/projects" style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
          All projects
        </Link>
      </div>
    </Page>
  );
}
