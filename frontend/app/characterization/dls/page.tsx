"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { CircleDot } from "lucide-react";

export default function DlsPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Dynamic Light Scattering (DLS)"
      description="Particle size and distribution analysis in suspension via photon correlation spectroscopy"
    >
      <ComingSoonCard
        icon={CircleDot}
        name="Dynamic Light Scattering"
        accentColor="var(--accent-green)"
        description="Dynamic light scattering measures the Brownian motion of particles in suspension by analyzing time-dependent fluctuations in scattered light intensity. The diffusion coefficient is used to calculate hydrodynamic diameter, providing size distributions from sub-nanometer to several micrometers."
        features={[
          "Hydrodynamic diameter distribution analysis",
          "Polydispersity index (PDI) determination",
          "Intensity, volume, and number-weighted distributions",
          "Cumulant and CONTIN inversion algorithms",
          "Zeta potential estimation from electrophoretic mobility",
          "Temperature-dependent stability studies",
        ]}
      />
    </Page>
  );
}
