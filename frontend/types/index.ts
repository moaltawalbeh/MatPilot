export type Project = {
  id: string;
  name: string;
  description: string;
  material: string;
  owner_id: string;
  file_ids: string[];
  job_ids: string[];
  experiment_ids: string[];
  status: "Active" | "Complete" | "Archived";
  tags: string[];
  created_at: string;
  updated_at: string;
  files: number;
  analyses: number;
};

export type Peak = {
  two_theta: number;
  intensity: number;
  fwhm: number | null;
  area: number | null;
  d_spacing: number | null;
  hkl: string | null;
};

export type ReferenceMatch = {
  material_name: string;
  material_formula: string;
  source_provider: string;
  source_id: string;
  match_score: number;
  matched_peaks: number;
  total_peaks: number;
  experimental_peak_2theta: number;
  reference_peak_2theta: number;
  d_spacing_experimental: number | null;
  d_spacing_reference: number | null;
  confidence: string | null;
};

export type IdentifiedPhase = {
  name: string;
  formula: string;
  source: string;
  confidence: string;
  match_score: number;
  matched_peaks: number;
};

export type AnalysisJob = {
  id: string;
  name: string;
  status: "Running" | "Complete" | "Queued" | "Failed";
  progress: number;
  started: string;
};

export type UploadResponse = {
  file_id: string;
  filename: string;
  detected_format: string;
  is_valid: boolean;
  file_size_bytes: number;
  data_points: number;
  two_theta_range: number[] | null;
  has_wavelength: boolean;
  wavelength_angstrom: number | null;
  metadata: Record<string, unknown>;
  validation_errors: string[];
  validation_warnings: string[];
  message: string;
};

export type UploadListItem = {
  file_id: string;
  filename: string;
  detected_format: string;
  is_valid: boolean;
  uploaded_at: string;
};

export type ProviderInfo = {
  name: string;
  display_name: string;
  description: string;
  is_available: boolean;
  supported_features: string[];
  version: string | null;
};

export type JobListItem = {
  job_id: string;
  experiment_id: string | null;
  job_type: string;
  status: string;
  progress: number;
  current_step: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  result_id: string | null;
  error: string | null;
};

export type AnalysisResult = {
  job_id: string;
  project_id: string | null;
  results: {
    peaks?: { two_theta: number; intensity: number; fwhm: number | null; area: number | null; d_spacing: number | null }[];
    reference_matches?: { material: string; formula: string; match_score: number; matched_peaks: number }[];
    identified_phases?: IdentifiedPhase[];
    report?: { title: string; summary: { total_peaks: number; phases_identified: number; top_phase: string } };
  };
  completed_at: string;
};

export type SystemHealth = {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  components: Record<string, unknown>;
};

export type AppError = {
  error: {
    type: string;
    message: string;
    path: string;
    method: string;
  };
};
