"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { AudioLines } from "lucide-react";

export default function FtirPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="FTIR Spectroscopy"
      description="Fourier-transform infrared analysis for molecular functional group identification and chemical characterization"
    >
      <ComingSoonCard
        icon={AudioLines}
        name="FTIR Spectroscopy"
        accentColor="var(--accent-purple)"
        description="FTIR spectroscopy measures the absorption of infrared radiation by molecular bonds, providing a unique fingerprint for identifying functional groups, chemical composition, and molecular structure of organic and inorganic materials."
        features={[
          "ATR and transmission mode spectral analysis",
          "Automatic atmospheric correction (CO₂, H₂O)",
          "Functional group identification and assignment",
          "Library search against reference spectra",
          "Quantitative concentration determination",
          "Kramers-Kronig transformation for optical constants",
        ]}
      />
    </Page>
  );
}
