"use client";

import { Page } from "@/components/ui/page";
import { ComingSoonCard } from "@/components/characterization/coming-soon-card";
import { Microscope } from "lucide-react";

export default function SemPage() {
  return (
    <Page
      eyebrow="Characterization Module"
      title="Scanning Electron Microscopy (SEM)"
      description="High-resolution surface imaging for morphological and microstructural characterization"
    >
      <ComingSoonCard
        icon={Microscope}
        name="SEM"
        accentColor="var(--accent-blue)"
        description="Scanning electron microscopy provides detailed surface morphology and topography information by scanning a focused electron beam across a sample. Secondary and backscattered electron signals reveal microstructural features from nanometer to millimeter scales."
        features={[
          "High-resolution secondary electron (SE) imaging",
          "Backscattered electron (BSE) compositional contrast",
          "Automated image stitching and tiling",
          "Particle size and distribution analysis",
          "Image processing with thresholding and segmentation",
          "Automated measurement and annotation tools",
        ]}
      />
    </Page>
  );
}
