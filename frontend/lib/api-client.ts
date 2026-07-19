import type {
  Project,
  UploadResponse,
  UploadListItem,
  ProviderInfo,
  JobListItem,
  SystemHealth,
  AnalysisResult,
  Experiment,
  PhaseIdRequest,
  PhaseIdResponse,
  RietveldRequest,
  RietveldResults,
  CIFFile,
  PipelineRequest,
  PipelineResponse,
  PipelineStage,
} from "@/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === "production") {
  console.warn("[MatPilot] NEXT_PUBLIC_API_URL is not set. API requests will fail in production.");
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (init?.headers) {
    Object.assign(headers, init.headers);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg =
      body?.error?.message || body?.detail || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

async function apiUpload(
  path: string,
  file: File,
  extraFields?: Record<string, string>,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg =
      body?.error?.message || body?.detail || `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json() as Promise<UploadResponse>;
}

export const apiService = {
  health: () => apiFetch<{ status: string; version: string }>("/health"),

  systemHealth: () => apiFetch<SystemHealth>("/system/health"),

  listProjects: () => apiFetch<Project[]>("/projects"),

  getProject: (id: string) => apiFetch<Project>(`/projects/${id}`),

  createProject: (data: {
    name: string;
    description?: string;
    material?: string;
    tags?: string[];
  }) =>
    apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProject: (
    id: string,
    data: { name?: string; description?: string; material?: string; status?: string },
  ) =>
    apiFetch<Project>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: "DELETE",
    }),

  addFileToProject: (projectId: string, fileId: string) =>
    apiFetch<Project>(`/projects/${projectId}/files/${fileId}`, {
      method: "POST",
    }),

  addJobToProject: (projectId: string, jobId: string) =>
    apiFetch<Project>(`/projects/${projectId}/jobs/${jobId}`, {
      method: "POST",
    }),

  listProjectFiles: (projectId: string) =>
    apiFetch<UploadListItem[]>(`/projects/${projectId}/files`),

  listProjectJobs: (projectId: string) =>
    apiFetch<{ jobs: JobListItem[]; total: number }>(`/projects/${projectId}/jobs`),

  listProjectExperiments: (projectId: string) =>
    apiFetch<Experiment[]>(`/projects/${projectId}/experiments`),

  getProjectStats: (projectId: string) =>
    apiFetch<{
      experiment_count: number;
      file_count: number;
      job_count: number;
      completed_job_count: number;
      has_data: boolean;
      has_results: boolean;
    }>(`/projects/${projectId}/stats`),

  getExperimentData: (projectId: string, experimentId: string) =>
    apiFetch<{
      experiment_id: string;
      two_theta: number[];
      intensity: number[];
      data_points: number;
      two_theta_range: number[] | null;
    }>(`/projects/${projectId}/experiments/${experimentId}/data`),

  uploadFile: (file: File, wavelength?: number, radiation?: string, projectId?: string, experimentId?: string) => {
    const fields: Record<string, string> = {};
    if (wavelength !== undefined) fields.wavelength = String(wavelength);
    if (radiation) fields.radiation = radiation;
    if (projectId) fields.project_id = projectId;
    if (experimentId) fields.experiment_id = experimentId;
    return apiUpload("/upload", file, Object.keys(fields).length ? fields : undefined);
  },

  listUploads: () => apiFetch<UploadListItem[]>("/upload"),

  getUpload: (fileId: string) =>
    apiFetch<Record<string, unknown>>(`/upload/${fileId}`),

  listProviders: () => apiFetch<ProviderInfo[]>("/providers"),

  listJobs: (params?: { status?: string; project_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.project_id) qs.set("project_id", params.project_id);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ jobs: JobListItem[]; total: number; limit: number; offset: number }>(
      `/jobs${q ? `?${q}` : ""}`,
    );
  },

  getJob: (jobId: string) =>
    apiFetch<JobListItem>(`/jobs/${jobId}`),

  getJobResult: (jobId: string) =>
    apiFetch<AnalysisResult>(`/jobs/${jobId}/result`),

  executeJob: (jobId: string) =>
    apiFetch<Record<string, unknown>>(`/jobs/${jobId}/execute`, {
      method: "POST",
    }),

  cancelJob: (jobId: string) =>
    apiFetch<Record<string, unknown>>(`/jobs/${jobId}/cancel`, {
      method: "POST",
    }),

  deleteJob: (jobId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/jobs/${jobId}`, {
      method: "DELETE",
    }),

  submitAnalysis: (data: {
    experiment_id: string;
    analysis_type?: string;
    parameters?: Record<string, unknown>;
    provider_preferences?: string[];
  }) =>
    apiFetch<Record<string, unknown>>("/analysis", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getAnalysis: (analysisId: string) =>
    apiFetch<Record<string, unknown>>(`/analysis/${analysisId}`),

  getConfig: () =>
    apiFetch<Record<string, unknown>>("/config"),

  // ── Experiment Workspace ──────────────────────────────────────

  getExperiment: (experimentId: string) =>
    apiFetch<Experiment>(`/experiments/${experimentId}`),

  runPhaseIdentification: (experimentId: string, data: PhaseIdRequest) =>
    apiFetch<PhaseIdResponse>(`/experiments/${experimentId}/phase-identification`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listExperimentCIFs: (experimentId: string) =>
    apiFetch<{ cif_files: CIFFile[] }>(`/experiments/${experimentId}/cifs`),

  uploadCIFFiles: (experimentId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return apiFetch<{ success: boolean; message: string; cif_files: CIFFile[] }>(
      `/experiments/${experimentId}/cifs`,
      { method: "POST", body: form },
    );
  },

  runRietveld: (experimentId: string, data: RietveldRequest) =>
    apiFetch<{ success: boolean; message: string; phases_used: Record<string, unknown>[]; rietveld_results: RietveldResults | null }>(
      `/experiments/${experimentId}/rietveld`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  // ── Pipeline ─────────────────────────────────────────────────

  runPipeline: (experimentId: string, data: PipelineRequest) =>
    apiFetch<PipelineResponse>(`/experiments/${experimentId}/pipeline`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPipelineStages: (experimentId: string) =>
    apiFetch<{ stages: PipelineStage[] }>(`/experiments/${experimentId}/pipeline/stages`),
};
