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

// ── Enterprise Platform Types ──────────────────────────────────────

export type SampleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type CrystalSystem = "cubic" | "hexagonal" | "tetragonal" | "orthorhombic" | "monoclinic" | "triclinic" | "rhombohedral";

export type Sample = {
  id: string;
  name: string;
  formula: string;
  description: string;
  owner_id: string | null;
  status: SampleStatus;
  crystal_system: CrystalSystem | null;
  space_group: string | null;
  lattice_params: Record<string, number> | null;
  composition: Record<string, unknown> | null;
  source: string;
  supplier: string | null;
  purity: number | null;
  batch_number: string | null;
  measurement_ids: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type InstrumentConfig = {
  instrument_name: string;
  radiation_type: string;
  wavelength_angstrom: number | null;
  tube_voltage_kv: number | null;
  tube_current_ma: number | null;
  optics: string | null;
};

export type ScanConfig = {
  scan_type: string;
  two_theta_start: number | null;
  two_theta_end: number | null;
  step_size_2theta: number | null;
  scan_speed_deg_per_min: number | null;
  total_time_seconds: number | null;
};

export type MeasurementStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type Measurement = {
  id: string;
  sample_id: string | null;
  experiment_id: string | null;
  name: string;
  description: string;
  status: MeasurementStatus;
  instrument: InstrumentConfig;
  scan: ScanConfig;
  data_points: number;
  two_theta: number[];
  intensity: number[];
  processed_two_theta: number[] | null;
  processed_intensity: number[] | null;
  peaks: Peak[];
  has_results: boolean;
  results_summary: Record<string, unknown> | null;
  file_id: string | null;
  raw_file_path: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type AtomSite = {
  label: string;
  element: string;
  x: number;
  y: number;
  z: number;
  occupancy: number;
  u_iso: number | null;
  wyckoff: string | null;
};

export type CrystalStructureTheoreticalPeak = {
  hkl: string;
  h: number;
  k: number;
  l: number;
  two_theta: number;
  d_spacing: number;
  intensity: number;
  f_squared: number;
  multiplicity: number;
};

export type CrystalStructure = {
  id: string;
  name: string;
  formula: string;
  source: string;
  source_id: string | null;
  a: number | null;
  b: number | null;
  c: number | null;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  space_group: string | null;
  crystal_system: string | null;
  z_number: number | null;
  atom_sites: AtomSite[];
  theoretical_peaks: CrystalStructureTheoreticalPeak[];
  cif_text: string | null;
  publication: string | null;
  doi: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CollectionType = "PROJECT" | "RESEARCH_GROUP" | "PUBLICATION" | "CUSTOM";

export type Collection = {
  id: string;
  name: string;
  description: string;
  owner_id: string | null;
  collection_type: CollectionType;
  sample_ids: string[];
  measurement_ids: string[];
  structure_ids: string[];
  experiment_ids: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type DownloadType = "REPORT_PDF" | "REPORT_HTML" | "CIF_FILE" | "PATTERN_DATA" | "PEAK_LIST" | "REFINEMENT_RESULT" | "BATCH_EXPORT";
export type DownloadStatus = "PENDING" | "PROCESSING" | "READY" | "EXPIRED" | "FAILED";

export type Download = {
  id: string;
  user_id: string | null;
  download_type: DownloadType;
  status: DownloadStatus;
  source_type: string;
  source_id: string | null;
  filename: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  experiment_id: string | null;
  error_message: string | null;
  created_at: string;
  expires_at: string | null;
  downloaded_at: string | null;
};

export type NotificationType = "JOB_COMPLETED" | "JOB_FAILED" | "REFINEMENT_COMPLETE" | "PHASE_IDENTIFICATION_COMPLETE" | "DOWNLOAD_READY" | "COLLABORATION_INVITE" | "SYSTEM_ALERT" | "COMMENT";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type Notification = {
  id: string;
  user_id: string | null;
  notification_type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  source_type: string;
  source_id: string | null;
  experiment_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
};

export type SearchConfig = {
  id: string;
  name: string;
  description: string;
  owner_id: string | null;
  search_type: string;
  query: string;
  elements: string[];
  space_group: string | null;
  crystal_system: string | null;
  providers: string[];
  max_results: number;
  min_match_score: number;
  filters: Record<string, unknown>;
  use_count: number;
  last_used_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ActivityType = "FILE_UPLOADED" | "PROJECT_CREATED" | "PROJECT_UPDATED" | "MEASUREMENT_STARTED" | "MEASUREMENT_COMPLETED" | "PHASE_IDENTIFICATION_RUN" | "RIETVELD_REFINEMENT_RUN" | "REPORT_GENERATED" | "SAMPLE_CREATED" | "SAMPLE_UPDATED" | "STRUCTURE_IMPORTED" | "COLLECTION_CREATED" | "SEARCH_PERFORMED" | "DOWNLOAD_COMPLETED" | "USER_LOGIN";

export type Activity = {
  id: string;
  user_id: string | null;
  activity_type: ActivityType;
  title: string;
  description: string;
  source_type: string;
  source_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserRole = "RESEARCHER" | "ANALYST" | "ADMIN" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type User = {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  organization_id: string | null;
  team_ids: string[];
  default_wavelength: number | null;
  preferred_providers: string[];
  language: string;
  timezone: string;
  last_login_at: string | null;
  login_count: number;
  avatar_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type OrgPlan = "FREE" | "PRO" | "ENTERPRISE";
export type OrgStatus = "ACTIVE" | "SUSPENDED" | "CANCELLED";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner_id: string | null;
  plan: OrgPlan;
  status: OrgStatus;
  team_ids: string[];
  member_ids: string[];
  max_members: number;
  max_projects: number;
  max_measurements: number;
  storage_limit_gb: number;
  storage_used_gb: number;
  settings: Record<string, unknown>;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardStats = {
  total_projects: number;
  total_samples: number;
  total_measurements: number;
  total_structures: number;
  total_experiments: number;
  active_jobs: number;
  completed_jobs: number;
  recent_activities: Activity[];
};

export type SearchResult = {
  items: Sample[] | Measurement[] | CrystalStructure[];
  total: number;
  query: string;
  page: number;
  page_size: number;
};

// ── Manual Refinement Types ──────────────────────────────────────

export interface RefinementParameter {
  name: string;
  label: string;
  value: number;
  initial_value: number;
  lower_bound: number;
  upper_bound: number;
  locked: boolean;
  category: string;
  description: string;
  uncertainty?: number | null;
}

export interface ManualRefinementSession {
  session_id: string;
  experiment_id: string;
  parameters: RefinementParameter[];
  current_step: number;
  history: Array<{ step: number; rwp: number | null; rp: number | null; action: string; parameters?: Record<string, number> }>;
  last_result?: RietveldResults | null;
  wavelength: number;
}

export type ParameterCategory =
  | "scale" | "background" | "profile" | "lattice"
  | "phase" | "instrument" | "sample" | "microstructure";
