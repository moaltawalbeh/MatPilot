import { Waves, AudioLines, Sun, LucideIcon } from "lucide-react";
import type { SpectroscopyTechnique } from "@/types";

export type TechniqueInfo = {
  slug: SpectroscopyTechnique;
  label: string;
  displayName: string;
  icon: LucideIcon;
  accentColor: string;
  bgColor: string;
  description: string;
  formats: string[];
  xAxisLabel: string;
  yAxisLabel: string;
  xUnit: string;
  yUnit: string;
  defaultWindow: number;
  defaultBaselineOrder: number;
  defaultProminencePercent: number;
  experimentFields: { label: string; hint: string }[];
  suggestedPrompts: string[];
};

export const TECHNIQUES: TechniqueInfo[] = [
  {
    slug: "ftir",
    label: "FTIR",
    displayName: "FTIR Spectroscopy",
    icon: AudioLines,
    accentColor: "var(--accent-purple)",
    bgColor: "var(--accent-purple-bg)",
    description:
      "Fourier-transform infrared spectroscopy measures molecular absorption to identify functional groups, chemical bonds, and molecular structure.",
    formats: [".csv", ".txt", ".dat", ".dpt", ".spa"],
    xAxisLabel: "Wavenumber (cm⁻¹)",
    yAxisLabel: "Absorbance (a.u.)",
    xUnit: "cm⁻¹",
    yUnit: "a.u.",
    defaultWindow: 7,
    defaultBaselineOrder: 1,
    defaultProminencePercent: 1,
    experimentFields: [
      { label: "ATR / Transmission", hint: "Sampling mode used for collection" },
      { label: "Resolution", hint: "Spectral resolution in cm⁻¹" },
      { label: "Scans", hint: "Number of co-added scans" },
    ],
    suggestedPrompts: [
      "Which functional groups are present in this FTIR spectrum?",
      "Explain the strongest absorption bands and their assignments.",
      "Is this spectrum consistent with an organic polymer?",
    ],
  },
  {
    slug: "raman",
    label: "Raman",
    displayName: "Raman Spectroscopy",
    icon: Waves,
    accentColor: "var(--accent-blue)",
    bgColor: "var(--accent-blue-bg)",
    description:
      "Raman spectroscopy probes molecular vibrations via inelastic light scattering for non-destructive material identification.",
    formats: [".csv", ".txt", ".dat", ".spc", ".jdx"],
    xAxisLabel: "Raman shift (cm⁻¹)",
    yAxisLabel: "Intensity (a.u.)",
    xUnit: "cm⁻¹",
    yUnit: "a.u.",
    defaultWindow: 5,
    defaultBaselineOrder: 2,
    defaultProminencePercent: 2,
    experimentFields: [
      { label: "Laser wavelength", hint: "Excitation wavelength in nm" },
      { label: "Laser power", hint: "Power at the sample in mW" },
      { label: "Grating / slit", hint: "Spectrograph configuration" },
    ],
    suggestedPrompts: [
      "Which molecular vibrations dominate this Raman spectrum?",
      "Identify the material class from these Raman bands.",
      "How do I interpret the Raman shift positions?",
    ],
  },
  {
    slug: "uvvis",
    label: "UV-Vis",
    displayName: "UV-Vis Spectroscopy",
    icon: Sun,
    accentColor: "var(--accent-orange)",
    bgColor: "var(--accent-orange-bg)",
    description:
      "UV-Visible spectroscopy measures electronic transitions to determine optical properties, band gaps, and chromophore content.",
    formats: [".csv", ".txt", ".dat", ".sp", ".uv"],
    xAxisLabel: "Wavelength (nm)",
    yAxisLabel: "Absorbance (a.u.)",
    xUnit: "nm",
    yUnit: "a.u.",
    defaultWindow: 5,
    defaultBaselineOrder: 1,
    defaultProminencePercent: 2,
    experimentFields: [
      { label: "Scan range", hint: "Start–end wavelength in nm" },
      { label: "Bandwidth", hint: "Spectral bandwidth in nm" },
      { label: "Baseline correction", hint: "Reference used for baseline" },
    ],
    suggestedPrompts: [
      "What electronic transitions explain these UV-Vis absorption bands?",
      "How can I estimate the optical band gap from this spectrum?",
      "Interpret the absorption maxima and their chromophores.",
    ],
  },
];

export function getTechnique(slug: SpectroscopyTechnique): TechniqueInfo {
  return TECHNIQUES.find((t) => t.slug === slug) ?? TECHNIQUES[0];
}
