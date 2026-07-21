"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Waves } from "lucide-react";

export default function RamanPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Raman Spectroscopy"
      description="Molecular vibration analysis for non-destructive material identification and structural characterization"
    >
      <ComingSoonCard
        icon={Waves}
        name="Raman Spectroscopy"
        accentColor="var(--accent-blue)"
        description="Raman spectroscopy probes inelastic light scattering to reveal molecular vibrations, crystal structure, and chemical bonding information. It is widely used for phase identification, stress/strain mapping, and compositional analysis of materials."
        features={[
          "Spectral acquisition and baseline correction",
          "Peak fitting and deconvolution analysis",
          "Molecular fingerprint database matching",
          "Strain and stress mapping from peak shifts",
          "Quantitative phase analysis via Raman intensities",
          "Multi-layer depth profiling capabilities",
        ]}
      />
    </Page>
  );
}
