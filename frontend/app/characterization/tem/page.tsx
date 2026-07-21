"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { ScanEye } from "lucide-react";

export default function TemPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Transmission Electron Microscopy (TEM)"
      description="Atomic-resolution imaging for internal microstructure and crystallographic characterization"
    >
      <ComingSoonCard
        icon={ScanEye}
        name="TEM"
        accentColor="var(--accent-purple)"
        description="Transmission electron microscopy transmits a high-energy electron beam through an ultrathin specimen, achieving atomic-resolution imaging of internal structures, crystal lattices, and defects. Combined with diffraction and spectroscopy, it provides comprehensive nanostructural characterization."
        features={[
          "High-resolution TEM (HRTEM) lattice imaging",
          "Selected area electron diffraction (SAED)",
          "Bright-field and dark-field imaging modes",
          "Crystal structure determination from diffraction patterns",
          "Nano-particle size and morphology analysis",
          "Energy-filtered TEM for elemental distribution",
        ]}
      />
    </Page>
  );
}
