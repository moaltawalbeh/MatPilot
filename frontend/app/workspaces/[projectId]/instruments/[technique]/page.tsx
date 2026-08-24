"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Grid3X3, Loader2 } from "lucide-react";
import { Page } from "@/components/ui/page";
import { useProject } from "@/hooks/use-api";
import { techniqueMeta } from "@/components/workspace/workspace";
import InstrumentWorkspace from "@/components/workspace/instrument-workspace";

export default function InstrumentWorkspacePage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const technique = params?.technique as string;
  const meta = techniqueMeta(technique);
  const { data: project } = useProject(projectId);
  const Icon = meta.icon;

  return (
    <Page
      title={`${meta.name} Workspace`}
      description={meta.description}
      eyebrow={project?.name ?? "Project workspace"}
      actions={
        <Link
          className="button"
          href={`/workspaces/${projectId}`}
          style={{ fontSize: 13 }}
        >
          <Grid3X3 size={14} /> All instruments
        </Link>
      }
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href={`/workspaces/${projectId}`}
          style={{ fontSize: 13, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={14} /> Workspace
        </Link>
        <span style={{ color: "var(--border-default)" }}>·</span>
        <span style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, color: meta.color }}>
          <Icon size={14} /> {meta.short}
        </span>
      </div>

      {!project ? (
        <Loader2 size={22} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : (
        <InstrumentWorkspace projectId={projectId} technique={technique} />
      )}
    </Page>
  );
}
