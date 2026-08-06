"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page } from "@/components/ui/page";
import { TechniqueWorkspace } from "@/components/spectroscopy/technique-workspace";
import { Waves } from "lucide-react";

function RamanWorkspace() {
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("sample_id") ?? undefined;
  return (
    <TechniqueWorkspace
      technique="raman"
      initialSampleId={sampleId}
    />
  );
}

export default function RamanPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Raman Spectroscopy"
      description="Raman scattering analysis of molecular vibrations for non-destructive material identification"
      actions={
        <span className="badge" style={{ fontSize: 11 }}>
          <Waves size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          Upload · Analyze · Report
        </span>
      }
    >
      <Suspense fallback={null}>
        <RamanWorkspace />
      </Suspense>
    </Page>
  );
}
