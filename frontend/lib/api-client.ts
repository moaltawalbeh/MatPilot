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
  Sample,
  Measurement,
  CrystalStructure,
  Collection,
  Download,
  Notification,
  SearchConfig,
  Activity,
  User,
  Organization,
  DashboardStats,
  SearchResult,
  RefinementParameter,
  ManualRefinementSession,
} from "@/types";

function resolveApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[MatPilot] NEXT_PUBLIC_API_URL is not set. " +
      "Configure it in your Vercel project settings to point to your backend (e.g. https://matpilot-1.onrender.com)."
    );
  }

  return "http://localhost:8000";
}

export const API_URL = resolveApiUrl();
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
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
  const token = typeof window !== "undefined" ? localStorage.getItem("matpilot_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
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

  // ── Samples ─────────────────────────────────────────────────────
  listSamples: (params?: { status?: string; tags?: string[]; search?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.tags) qs.set("tags", params.tags.join(","));
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ samples: Sample[]; total: number }>(`/samples${q ? `?${q}` : ""}`);
  },

  getSample: (id: string) => apiFetch<Sample>(`/samples/${id}`),

  createSample: (data: { name: string; formula?: string; description?: string; crystal_system?: string; tags?: string[] }) =>
    apiFetch<Sample>("/samples", { method: "POST", body: JSON.stringify(data) }),

  updateSample: (id: string, data: { name?: string; formula?: string; description?: string; status?: string; crystal_system?: string; tags?: string[] }) =>
    apiFetch<Sample>(`/samples/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteSample: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/samples/${id}`, { method: "DELETE" }),

  // ── Measurements ────────────────────────────────────────────────
  listMeasurements: (params?: { sample_id?: string; status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.sample_id) qs.set("sample_id", params.sample_id);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ measurements: Measurement[]; total: number }>(`/measurements${q ? `?${q}` : ""}`);
  },

  getMeasurement: (id: string) => apiFetch<Measurement>(`/measurements/${id}`),

  createMeasurement: (data: { sample_id?: string; name?: string; instrument?: Record<string, unknown>; scan?: Record<string, unknown> }) =>
    apiFetch<Measurement>("/measurements", { method: "POST", body: JSON.stringify(data) }),

  updateMeasurement: (id: string, data: { name?: string; status?: string }) =>
    apiFetch<Measurement>(`/measurements/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteMeasurement: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/measurements/${id}`, { method: "DELETE" }),

  // ── Crystal Structures ──────────────────────────────────────────
  listStructures: (params?: { source?: string; formula?: string; space_group?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.source) qs.set("source", params.source);
    if (params?.formula) qs.set("formula", params.formula);
    if (params?.space_group) qs.set("space_group", params.space_group);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ structures: CrystalStructure[]; total: number }>(`/structures${q ? `?${q}` : ""}`);
  },

  getStructure: (id: string) => apiFetch<CrystalStructure>(`/structures/${id}`),

  createStructure: (data: { name: string; formula: string; source?: string; source_id?: string; a?: number; b?: number; c?: number; alpha?: number; beta?: number; gamma?: number; space_group?: string; cif_text?: string; tags?: string[] }) =>
    apiFetch<CrystalStructure>("/structures", { method: "POST", body: JSON.stringify(data) }),

  updateStructure: (id: string, data: { name?: string; formula?: string; tags?: string[] }) =>
    apiFetch<CrystalStructure>(`/structures/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteStructure: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/structures/${id}`, { method: "DELETE" }),

  importStructureCIF: (cifText: string, source?: string, sourceId?: string) =>
    apiFetch<CrystalStructure>("/structures/import", {
      method: "POST",
      body: JSON.stringify({ cif_text: cifText, source, source_id: sourceId }),
    }),

  // ── Collections ─────────────────────────────────────────────────
  listCollections: (params?: { collection_type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.collection_type) qs.set("collection_type", params.collection_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ collections: Collection[]; total: number }>(`/collections${q ? `?${q}` : ""}`);
  },

  getCollection: (id: string) => apiFetch<Collection>(`/collections/${id}`),

  createCollection: (data: { name: string; description?: string; collection_type?: string; tags?: string[] }) =>
    apiFetch<Collection>("/collections", { method: "POST", body: JSON.stringify(data) }),

  updateCollection: (id: string, data: { name?: string; description?: string; is_public?: boolean }) =>
    apiFetch<Collection>(`/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteCollection: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/collections/${id}`, { method: "DELETE" }),

  addSampleToCollection: (collectionId: string, sampleId: string) =>
    apiFetch<Collection>(`/collections/${collectionId}/samples/${sampleId}`, { method: "POST" }),

  removeSampleFromCollection: (collectionId: string, sampleId: string) =>
    apiFetch<Collection>(`/collections/${collectionId}/samples/${sampleId}`, { method: "DELETE" }),

  // ── Downloads ───────────────────────────────────────────────────
  listDownloads: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ downloads: Download[]; total: number }>(`/downloads${q ? `?${q}` : ""}`);
  },

  requestDownload: (data: { download_type: string; source_type: string; source_id?: string; experiment_id?: string }) =>
    apiFetch<Download>("/downloads", { method: "POST", body: JSON.stringify(data) }),

  getDownload: (id: string) => apiFetch<Download>(`/downloads/${id}`),

  deleteDownload: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/downloads/${id}`, { method: "DELETE" }),

  // ── Notifications ───────────────────────────────────────────────
  listNotifications: (params?: { unread_only?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unread_only) qs.set("unread_only", "true");
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiFetch<{ notifications: Notification[]; total: number; unread_count: number }>(`/notifications${q ? `?${q}` : ""}`);
  },

  markNotificationRead: (id: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: "POST" }),

  markAllNotificationsRead: () =>
    apiFetch<{ success: boolean; count: number }>("/notifications/read-all", { method: "POST" }),

  deleteNotification: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/notifications/${id}`, { method: "DELETE" }),

  // ── Search Configs ──────────────────────────────────────────────
  listSearchConfigs: (params?: { search_type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search_type) qs.set("search_type", params.search_type);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiFetch<{ configs: SearchConfig[]; total: number }>(`/search-configs${q ? `?${q}` : ""}`);
  },

  getSearchConfig: (id: string) => apiFetch<SearchConfig>(`/search-configs/${id}`),

  createSearchConfig: (data: { name: string; description?: string; search_type: string; query?: string; elements?: string[]; providers?: string[]; max_results?: number }) =>
    apiFetch<SearchConfig>("/search-configs", { method: "POST", body: JSON.stringify(data) }),

  deleteSearchConfig: (id: string) =>
    apiFetch<{ success: boolean; message: string }>(`/search-configs/${id}`, { method: "DELETE" }),

  // ── Activity ────────────────────────────────────────────────────
  listActivities: (params?: { project_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.project_id) qs.set("project_id", params.project_id);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ activities: Activity[]; total: number }>(`/activities${q ? `?${q}` : ""}`);
  },

  // ── Dashboard ───────────────────────────────────────────────────
  getDashboardStats: () => apiFetch<DashboardStats>("/dashboard/stats"),

  // ── Users ───────────────────────────────────────────────────────
  listUsers: (params?: { role?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.role) qs.set("role", params.role);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ users: User[]; total: number }>(`/admin/users${q ? `?${q}` : ""}`);
  },

  getUser: (id: string) => apiFetch<User>(`/admin/users/${id}`),

  updateUser: (id: string, data: { role?: string; status?: string }) =>
    apiFetch<User>(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // ── Organizations ───────────────────────────────────────────────
  getOrganization: (id: string) => apiFetch<Organization>(`/organizations/${id}`),

  updateOrganization: (id: string, data: { name?: string; settings?: Record<string, unknown> }) =>
    apiFetch<Organization>(`/organizations/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // ── Global Search ───────────────────────────────────────────────
  globalSearch: (params: { q: string; type?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    qs.set("q", params.q);
    if (params.type) qs.set("type", params.type);
    if (params.limit) qs.set("limit", String(params.limit));
    return apiFetch<SearchResult>(`/search?${qs.toString()}`);
  },

  // ── Auth ─────────────────────────────────────────────────────────
  register: (data: { username: string; email: string; password: string; full_name?: string }) =>
    apiFetch<{ user: AuthUser; access_token: string; refresh_token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { username_or_email: string; password: string }) =>
    apiFetch<{ user: AuthUser; access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refreshToken: (refreshToken: string) =>
    apiFetch<{ access_token: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),

  getMe: () => apiFetch<AuthUser>("/auth/me"),

  // ── Manual Refinement ──────────────────────────────────────────

  initManualRefinement: (data: { experiment_id: string; phase_cifs: CIFFile[]; wavelength?: number }) =>
    apiFetch<{ session_id: string; parameters: RefinementParameter[]; last_result?: RietveldResults | null; current_step: number; history: Array<{ step: number; rwp: number | null; rp: number | null; action: string }> }>(
      "/manual-refinement/init", { method: "POST", body: JSON.stringify(data) },
    ),

  getManualRefinement: (sessionId: string) =>
    apiFetch<ManualRefinementSession>(`/manual-refinement/${sessionId}`),

  getRefinementParameters: () =>
    apiFetch<RefinementParameter[]>("/manual-refinement/parameters"),

  setRefinementParameter: (sessionId: string, paramName: string, data: { value?: number; locked?: boolean }) =>
    apiFetch<{ success: boolean; parameter: RefinementParameter }>(`/manual-refinement/${sessionId}/parameters/${paramName}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  lockRefinementParameters: (sessionId: string, paramNames: string[]) =>
    apiFetch<{ success: boolean; locked: string[] }>(`/manual-refinement/${sessionId}/lock`, {
      method: "POST", body: JSON.stringify({ param_names: paramNames }),
    }),

  unlockRefinementParameters: (sessionId: string, paramNames: string[]) =>
    apiFetch<{ success: boolean; unlocked: string[] }>(`/manual-refinement/${sessionId}/unlock`, {
      method: "POST", body: JSON.stringify({ param_names: paramNames }),
    }),

  runRefinementStep: (sessionId: string) =>
    apiFetch<ManualRefinementSession>(
      `/manual-refinement/${sessionId}/step`, { method: "POST" },
    ),

  runFullRefinement: (sessionId: string) =>
    apiFetch<ManualRefinementSession>(
      `/manual-refinement/${sessionId}/full`, { method: "POST" },
    ),

  undoRefinementStep: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/manual-refinement/${sessionId}/undo`, { method: "POST" }),

  resetRefinement: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/manual-refinement/${sessionId}/reset`, { method: "POST" }),

  deleteRefinementSession: (sessionId: string) =>
    apiFetch<{ success: boolean }>(`/manual-refinement/${sessionId}`, { method: "DELETE" }),

  // ── Blob downloads ─────────────────────────────────────────

  downloadReport: async (experimentId: string): Promise<Blob> => {
    const headers: Record<string, string> = {};
    const token = typeof window !== "undefined" ? localStorage.getItem("matpilot_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/report/generate/${experimentId}`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to generate report");
    return res.blob();
  },
};
