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
  experiments: number;
};

export type Experiment = {
  id: string;
  project_id: string;
  name: string;
  description: string;
  material: string;
  status: string;
  file_ids: string[];
  primary_file_id: string | null;
  has_pattern_data: boolean;
  has_crystal_structure: boolean;
  data_points: number;
  two_theta_range: number[] | null;
  wavelength_angstrom: number | null;
  raw_two_theta: number[] | null;
  raw_intensity: number[] | null;
  job_ids: string[];
  has_results: boolean;
  candidate_phases: CandidatePhase[];
  cif_files: CIFFile[];
  selected_refinement_phases: CIFFile[];
  rietveld_results: RietveldResults | null;
  detected_peaks: Peak[];
  pipeline_stages: PipelineStage[];
  analysis_history: HistoryEntry[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CandidatePhase = {
  rank: number;
  material_name: string;
  material_formula: string;
  source_id: string;
  source_provider: string;
  match_score: number;
  fom: number | null;
  rmse_2theta: number | null;
  cosine_similarity: number | null;
  confidence: string;
  matched_peaks: number;
  total_experimental_peaks: number;
  total_reference_peaks: number;
  peak_fraction: number | null;
};

export type CIFFile = {
  cod_id: string;
  material_name: string;
  material_formula: string;
  source_provider: string;
  downloaded: boolean;
  uploaded?: boolean;
  filename?: string;
  used_for_phase_id?: boolean;
  parsed_data?: Record<string, unknown>;
};

export type RietveldParameters = {
  scale: number | null;
  zero_shift: number | null;
  background_coeffs: number[];
  U: number | null;
  V: number | null;
  W: number | null;
  phase_fractions: number[];
};

export type RietveldPatterns = {
  two_theta: number[];
  observed: number[];
  calculated: number[];
  difference: number[];
  background: number[];
};

export type RietveldPhaseInfo = {
  formula: string;
  name: string;
  space_group: string;
  fraction: number;
  n_peaks: number;
  lattice_params: Record<string, number>;
};

export type RietveldResults = {
  status: string;
  workflow: string;
  message: string;
  r_wp: number | null;
  r_p: number | null;
  r_exp: number | null;
  chi_squared: number | null;
  gof: number | null;
  iterations: number | null;
  parameters: RietveldParameters | null;
  patterns: RietveldPatterns | null;
  phases_used: RietveldPhaseInfo[];
  bragg_markers: BraggMarker[];
  refinement_history: RefinementIteration[];
};

export type HistoryEntry = {
  action: string;
  timestamp: string;
  details: Record<string, unknown>;
};

export type PhaseIdRequest = {
  query: string;
  elements?: string[];
  limit?: number;
};

export type PhaseIdResponse = {
  success: boolean;
  message: string;
  candidate_phases: CandidatePhase[];
  cif_files: CIFFile[];
  peaks_detected: number;
  candidates_searched: number;
};

export type RietveldRequest = {
  workflow: "auto" | "upload";
  selected_cif_ids?: string[];
};

export type Peak = {
  two_theta: number;
  intensity: number;
  fwhm: number | null;
  area: number | null;
  d_spacing: number | null;
  hkl: string | null;
};

export type BraggMarker = {
  two_theta: number;
  intensity: number;
  hkl: string;
  phase_name: string;
  phase_index: number;
  phase_fraction: number;
};

export type RefinementIteration = {
  iteration: number;
  rwp: number;
  rp: number;
  cost: number;
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
  source_id?: string;
  confidence: string;
  match_score: number;
  matched_peaks: number;
  total_peaks?: number;
  fom?: number;
  rmse_2theta?: number;
  cosine_similarity?: number;
  space_group?: string;
  crystal_system?: string;
  theoretical_peaks?: TheoreticalPeak[];
};

export type TheoreticalPeak = {
  two_theta: number;
  intensity: number;
  d_spacing: number;
  hkl: string;
  h: number;
  k: number;
  l: number;
  f_squared: number;
};

export type TheoreticalPattern = {
  material: string;
  formula: string;
  source_id: string;
  peaks: TheoreticalPeak[];
  match_score: number;
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
  experiment_id: string | null;
  job_id: string | null;
  analysis_started: boolean;
  two_theta?: number[];
  intensity?: number[];
};

export type UploadListItem = {
  file_id: string;
  filename: string;
  detected_format: string;
  is_valid: boolean;
  uploaded_at: string;
  experiment_id?: string | null;
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
    parsed_data?: { two_theta: number[]; intensity: number[]; data_points: number };
    peaks?: { two_theta: number; intensity: number; fwhm: number | null; area: number | null; d_spacing: number | null }[];
    reference_matches?: { material: string; formula: string; match_score: number; matched_peaks: number; provider?: string; source_id?: string; fom?: number; rmse_2theta?: number; cosine_similarity?: number; theoretical_peaks?: TheoreticalPeak[] }[];
    identified_phases?: IdentifiedPhase[];
    theoretical_patterns?: TheoreticalPattern[];
    report?: {
      title: string;
      generated_at?: string;
      summary: {
        total_peaks: number;
        phases_identified: number;
        top_phase: string;
        top_formula?: string;
        top_match_score?: number;
        top_confidence?: string;
        reference_source?: string;
      };
      methodology?: Record<string, string>;
      theoretical_patterns?: TheoreticalPattern[];
    };
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

export type PipelineStage = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error: string | null;
  parameters: Record<string, unknown>;
  outputs: Record<string, unknown>;
};

export type PipelineRequest = {
  stages?: string[];
  stage_params?: Record<string, Record<string, unknown>>;
};

export type PipelineResponse = {
  success: boolean;
  message: string;
  completed_stages: string[];
  results: Record<string, unknown>;
};
