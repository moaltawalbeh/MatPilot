"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Thermometer } from "lucide-react";

export default function TgaPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Thermogravimetric Analysis (TGA)"
      description="Mass change measurement under controlled thermal environment for decomposition and stability studies"
    >
      <ComingSoonCard
        icon={Thermometer}
        name="TGA"
        accentColor="var(--accent-red)"
        description="Thermogravimetric analysis continuously measures sample mass as a function of temperature or time under a controlled atmosphere. It reveals thermal decomposition, oxidation, reduction, desorption, and evaporation events, providing quantitative compositional information and thermal stability data."
        features={[
          "Mass loss/gain curves with derivative (DTG) analysis",
          "Multi-step decomposition profile fitting",
          "Atmosphere control (air, N₂, O₂, Ar)",
          "Kinetic analysis via Friedman and Kissinger methods",
          "Evolved gas analysis integration",
          "Residual mass and volatile content quantification",
        ]}
      />
    </Page>
  );
}
