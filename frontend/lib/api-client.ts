import type {
  Project,
  UploadResponse,
  UploadListItem,
  ProviderInfo,
  JobListItem,
  SystemHealth,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
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

  uploadFile: (file: File, wavelength?: number, radiation?: string) => {
    const fields: Record<string, string> = {};
    if (wavelength !== undefined) fields.wavelength = String(wavelength);
    if (radiation) fields.radiation = radiation;
    return apiUpload("/upload", file, Object.keys(fields).length ? fields : undefined);
  },

  listUploads: () => apiFetch<UploadListItem[]>("/upload"),

  getUpload: (fileId: string) =>
    apiFetch<Record<string, unknown>>(`/upload/${fileId}`),

  listProviders: () => apiFetch<ProviderInfo[]>("/providers"),

  listJobs: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return apiFetch<{ jobs: JobListItem[]; total: number; limit: number; offset: number }>(
      `/jobs${q ? `?${q}` : ""}`,
    );
  },

  getJob: (jobId: string) =>
    apiFetch<JobListItem>(`/jobs/${jobId}`),

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
};
