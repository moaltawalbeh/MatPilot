import type { ReferenceMatch, Peak, Project } from "@/types";

type MockJob = {
  id: string;
  name: string;
  status: string;
  progress: number;
  started: string;
};

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 120));

export const projects: Project[] = [
  { id: "mp-024", name: "NMC-811 cathode study", description: "XRD phase identification", material: "LiNi₀.₈Mn₀.₁Co₀.₁O₂", owner_id: "demo", file_ids: [], job_ids: [], experiment_ids: [], status: "Active", tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), files: 8, analyses: 3, experiments: 3 },
  { id: "mp-023", name: "Perovskite stability screen", description: "Stability analysis", material: "BaTiO₃", owner_id: "demo", file_ids: [], job_ids: [], experiment_ids: [], status: "Active", tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), files: 14, analyses: 7, experiments: 7 },
  { id: "mp-021", name: "TiO₂ phase comparison", description: "Phase comparison study", material: "TiO₂", owner_id: "demo", file_ids: [], job_ids: [], experiment_ids: [], status: "Complete", tags: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), files: 5, analyses: 2, experiments: 2 },
];

export const peaks: Peak[] = [
  { two_theta: 18.7, intensity: 42, fwhm: 0.5, area: 21, d_spacing: 4.74, hkl: null },
  { two_theta: 37.5, intensity: 100, fwhm: 0.4, area: 40, d_spacing: 2.40, hkl: null },
  { two_theta: 44.2, intensity: 69, fwhm: 0.35, area: 24, d_spacing: 2.05, hkl: null },
  { two_theta: 48.5, intensity: 56, fwhm: 0.3, area: 17, d_spacing: 1.88, hkl: null },
  { two_theta: 65, intensity: 38, fwhm: 0.5, area: 19, d_spacing: 1.43, hkl: null },
];

export const mockService = {
  projects: () => delay(projects),
  project: (id: string) => delay(projects.find((x) => x.id === id) ?? projects[0]),
  jobs: () =>
    delay<MockJob[]>([
      { id: "job-390", name: "Phase identification", status: "Running", progress: 74, started: "4 min ago" },
      { id: "job-389", name: "Peak detection", status: "Complete", progress: 100, started: "8 min ago" },
      { id: "job-388", name: "Rietveld refinement", status: "Queued", progress: 0, started: "Now" },
    ]),
  peaks: () => delay(peaks),
};
