import { FileBarChart, AudioLines, Waves, Sun } from "lucide-react";
import type { InstrumentTechnique } from "@/types";

export type WorkspaceTechnique = {
  id: InstrumentTechnique;
  name: string;
  short: string;
  icon: typeof FileBarChart;
  color: string;
  xAxis: string;
  description: string;
  capabilities: string[];
};

export const WORKSPACE_TECHNIQUES: WorkspaceTechnique[] = [
  {
    id: "ftir",
    name: "FTIR Spectroscopy",
    short: "FTIR",
    icon: AudioLines,
    color: "var(--accent-emerald)",
    xAxis: "Wavenumber (cm⁻¹)",
    description:
      "Identify functional groups and vibrational modes from infrared absorption bands.",
    capabilities: [
      "Functional Group ID",
      "Peak/Band Assignment",
      "Vibrational Mode Analysis",
      "Baseline Correction",
      "Peak Deconvolution",
      "Spectral Matching",
      "Library Search",
      "AI",
    ],
  },
  {
    id: "raman",
    name: "Raman Spectroscopy",
    short: "Raman",
    icon: Waves,
    color: "var(--accent-cyan)",
    xAxis: "Raman shift (cm⁻¹)",
    description:
      "Molecular fingerprinting and material identification from characteristic Raman shifts.",
    capabilities: [
      "Peak Assignment",
      "Phase ID",
      "Background Removal",
      "Cosmic Ray Removal",
      "Peak Fitting",
      "Material ID",
      "Library Search",
      "AI",
    ],
  },
  {
    id: "uvvis",
    name: "UV-Vis Spectroscopy",
    short: "UV-Vis",
    icon: Sun,
    color: "var(--accent-amber)",
    xAxis: "Wavelength (nm)",
    description:
      "Optical absorption/reflectance processing with Tauc band-gap determination.",
    capabilities: [
      "Absorbance/Reflectance Processing",
      "Kubelka-Munk",
      "Tauc Plot",
      "Direct/Indirect Band Gap",
      "Optical Transition",
      "Peak Analysis",
      "AI",
    ],
  },
  {
    id: "xrd",
    name: "X-ray Diffraction",
    short: "XRD",
    icon: FileBarChart,
    color: "var(--accent-orange)",
    xAxis: "2θ (deg)",
    description:
      "Crystal structure, phase identification, Rietveld refinement and lattice analysis.",
    capabilities: [
      "Phase Identification",
      "Rietveld",
      "Peak Indexing",
      "Crystal Structure",
      "Lattice Parameters",
      "Crystallite Size",
      "Microstrain",
      "Preferred Orientation",
    ],
  },
];

export function techniqueMeta(id: string | undefined): WorkspaceTechnique {
  return (
    WORKSPACE_TECHNIQUES.find((t) => t.id === id) ?? WORKSPACE_TECHNIQUES[0]
  );
}

export function parseTwoColumnText(
  text: string,
): { x: number[]; y: number[] } | null {
  const x: number[] = [];
  const y: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("%")) continue;
    const parts = line.split(/[\s,;\t]+/).filter(Boolean);
    if (parts.length < 2) continue;
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    x.push(a);
    y.push(b);
  }
  if (x.length < 5) return null;
  return { x, y };
}
