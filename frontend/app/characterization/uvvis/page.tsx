"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Sun } from "lucide-react";

export default function UvvisPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="UV-Vis Spectroscopy"
      description="Ultraviolet-visible absorption analysis for electronic transitions and optical property determination"
    >
      <ComingSoonCard
        icon={Sun}
        name="UV-Vis Spectroscopy"
        accentColor="var(--accent-orange)"
        description="UV-Vis spectroscopy measures electronic transitions in the ultraviolet and visible regions, providing information on bandgap energies, optical absorption, electronic structure, and concentration of chromophoric species in materials."
        features={[
          "Absorption and transmittance spectrum analysis",
          "Tauc plot determination of optical bandgap",
          "Concentration analysis via Beer-Lambert law",
          "Film thickness estimation from interference fringes",
          "Reflector and absorber characterization",
          "Multi-wavelength kinetic measurements",
        ]}
      />
    </Page>
  );
}
