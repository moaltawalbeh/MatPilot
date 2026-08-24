"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page } from "@/components/ui/page";
import { TechniqueWorkspace } from "@/components/spectroscopy/technique-workspace";
import { AudioLines } from "lucide-react";

function FtirWorkspace() {
  const searchParams = useSearchParams();
  const sampleId = searchParams.get("sample_id") ?? undefined;
  return (
    <TechniqueWorkspace
      technique="ftir"
      initialSampleId={sampleId}
    />
  );
}

export default function FtirPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="FTIR Spectroscopy"
      description="Fourier-transform infrared analysis for molecular functional group identification and chemical characterization"
      actions={
        <span className="badge" style={{ fontSize: 11 }}>
          <AudioLines size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          Upload · Analyze · Report
        </span>
      }
    >
      <Suspense fallback={null}>
        <FtirWorkspace />
      </Suspense>
    </Page>
  );
}
