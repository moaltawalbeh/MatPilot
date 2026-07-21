"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Target } from "lucide-react";

export default function XpsPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="X-ray Photoelectron Spectroscopy (XPS)"
      description="Surface chemical analysis for oxidation states and elemental composition"
    >
      <ComingSoonCard
        icon={Target}
        name="XPS"
        accentColor="var(--accent-orange)"
        description="XPS, also known as Electron Spectroscopy for Chemical Analysis (ESCA), measures the binding energy of core-level electrons ejected by X-ray irradiation. It provides quantitative elemental composition and chemical state information from the top 1–10 nm of a material surface."
        features={[
          "Core-level peak fitting and chemical state assignment",
          "Quantitative surface elemental composition",
          "Depth profiling via angle-resolved XPS",
          "Chemical state mapping and imaging",
          "Charge referencing and calibration tools",
          "Automated peak identification and reporting",
        ]}
      />
    </Page>
  );
}
