"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Flame } from "lucide-react";

export default function DscPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Differential Scanning Calorimetry (DSC)"
      description="Heat flow measurement for thermal transitions, phase changes, and reaction kinetics"
    >
      <ComingSoonCard
        icon={Flame}
        name="DSC"
        accentColor="var(--accent-orange)"
        description="Differential scanning calorimetry measures the difference in heat flow between a sample and reference as both are subjected to controlled temperature programs. It detects glass transitions, melting, crystallization, curing, and other thermal transitions with high sensitivity."
        features={[
          "Heat flow curve analysis and peak integration",
          "Glass transition temperature (Tg) determination",
          "Melting and crystallization point identification",
          "Specific heat capacity (Cp) measurement",
          "Curing kinetics and reaction enthalpy analysis",
          "Modulated DSC for overlapping transitions",
        ]}
      />
    </Page>
  );
}
