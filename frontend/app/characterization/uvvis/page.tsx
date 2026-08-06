"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page } from "@/components/ui/page";
import { TechniqueWorkspace } from "@/components/spectroscopy/technique-workspace";
import { Sun } from "lucide-react";

function UvvisWorkspace() {
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("sample_id") ?? undefined;
  return (
    <TechniqueWorkspace
      technique="uvvis"
      initialSampleId={sampleId}
    />
  );
}

export default function UvvisPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="UV-Vis Spectroscopy"
      description="Ultraviolet-visible absorption analysis for electronic transitions and optical property determination"
      actions={
        <span className="badge" style={{ fontSize: 11 }}>
          <Sun size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          Upload · Analyze · Report
        </span>
      }
    >
      <Suspense fallback={null}>
        <UvvisWorkspace />
      </Suspense>
    </Page>
  );
}
