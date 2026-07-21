"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Atom } from "lucide-react";

export default function EdsPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Energy Dispersive X-ray Spectroscopy (EDS/EDX)"
      description="Elemental analysis and mapping for compositional characterization of materials"
    >
      <ComingSoonCard
        icon={Atom}
        name="EDS/EDX"
        accentColor="var(--accent-green)"
        description="Energy dispersive X-ray spectroscopy detects characteristic X-rays emitted from a sample under electron excitation, enabling elemental identification and quantitative compositional analysis. When coupled with SEM or TEM, it provides spatially resolved elemental mapping."
        features={[
          "Elemental identification from X-ray spectra",
          "Quantitative composition via ZAF corrections",
          "Elemental mapping and line scans",
          "Spot analysis for targeted composition",
          "Spectrum deconvolution and peak overlap correction",
          "Light element detection (B through U)",
        ]}
      />
    </Page>
  );
}
