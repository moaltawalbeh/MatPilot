"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/ui/page";
import { useGetInstrumentExperiment } from "@/hooks/use-api";
import { techniqueMeta } from "@/components/workspace/workspace";
import ExperimentResults from "@/components/workspace/experiment-results";

export default function ExperimentResultsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const technique = params?.technique as string;
  const eid = params?.eid as string;
  const meta = techniqueMeta(technique);
  const { data: detail } = useGetInstrumentExperiment(projectId, meta.id, eid);

  return (
    <Page
      title={detail?.name ?? "Experiment results"}
      description={`${meta.name} analysis results`}
      eyebrow={detail?.material ? `${detail.material} · ${meta.short}` : meta.short}
      actions={
        <Link
          className="button"
          href={`/workspaces/${projectId}/instruments/${technique}`}
          style={{ fontSize: 13 }}
        >
          <ArrowLeft size={14} /> Back to {meta.short} workspace
        </Link>
      }
    >
      <ExperimentResults projectId={projectId} technique={technique} eid={eid} />
    </Page>
  );
}
