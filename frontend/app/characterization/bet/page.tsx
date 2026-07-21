"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Layers } from "lucide-react";

export default function BetPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="BET Surface Area Analysis"
      description="Gas adsorption analysis for specific surface area and porosity characterization"
    >
      <ComingSoonCard
        icon={Layers}
        name="BET Surface Area"
        accentColor="var(--accent-blue)"
        description="BET (Brunauer-Emmett-Teller) analysis uses physical gas adsorption isotherms to determine the specific surface area, pore size distribution, and pore volume of porous materials. It is essential for characterizing catalysts, adsorbents, membranes, and nanomaterials."
        features={[
          "Multi-point BET specific surface area calculation",
          "Single-point BET surface area estimation",
          "BJH pore size distribution from desorption isotherms",
          "DFT pore size distribution analysis",
          "Micropore analysis via t-plot and Horvath-Kawazoe methods",
          "Total pore volume and average pore diameter",
        ]}
      />
    </Page>
  );
}
