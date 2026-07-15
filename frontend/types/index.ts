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
  angle: number;
  intensity: number;
  hkl: string;
  phase: string;
};

export type Match = {
  formula: string;
  name: string;
  source: string;
  score: number;
  system: string;
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
