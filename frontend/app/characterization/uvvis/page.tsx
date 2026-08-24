"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page } from "@/components/ui/page";
import { TechniqueWorkspace } from "@/components/spectroscopy/technique-workspace";
import { Sun } from "lucide-react";

function UvVisWorkspace() {
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("sample_id") ?? undefined;
  return (
    <TechniqueWorkspace
      technique="uvvis"
      initialSampleId={sampleId}
    />
  );
}

export default function UvVisPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="UV–Vis Spectroscopy & Band Gap"
      description="Ultraviolet-visible absorption spectroscopy, Tauc plot optical bandgap extraction, and electronic transition analysis"
      actions={
        <span className="badge" style={{ fontSize: 11 }}>
          <Sun size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          Upload · Analyze · Report
        </span>
      }
    >
      <Suspense fallback={null}>
        <UvVisWorkspace />
      </Suspense>
    </Page>
  );
}
