"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api-client";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: apiService.listProjects,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => apiService.getProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; material?: string; status?: string }) =>
      apiService.updateProject(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["projects", vars.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: apiService.listProviders,
  });
}

export function useJobs(params?: { status?: string; project_id?: string }) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => apiService.listJobs(params),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: () => apiService.getJob(id),
    enabled: !!id,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (data && (data.status === "RUNNING" || data.status === "QUEUED")) return 2000;
      return false;
    },
  });
}

export function useJobResult(id: string) {
  return useQuery({
    queryKey: ["job-result", id],
    queryFn: () => apiService.getJobResult(id),
    enabled: !!id,
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, wavelength, radiation, projectId, experimentId }: { file: File; wavelength?: number; radiation?: string; projectId?: string; experimentId?: string }) =>
      apiService.uploadFile(file, wavelength, radiation, projectId, experimentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uploads"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUploads() {
  return useQuery({
    queryKey: ["uploads"],
    queryFn: apiService.listUploads,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: apiService.systemHealth,
    refetchInterval: 30_000,
  });
}

export function useExecuteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.executeJob,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job-result"] });
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.cancelJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => apiService.listProjectFiles(projectId),
    enabled: !!projectId,
  });
}

export function useProjectJobs(projectId: string) {
  return useQuery({
    queryKey: ["project-jobs", projectId],
    queryFn: () => apiService.listProjectJobs(projectId),
    enabled: !!projectId,
  });
}

export function useProjectExperiments(projectId: string) {
  return useQuery({
    queryKey: ["project-experiments", projectId],
    queryFn: () => apiService.listProjectExperiments(projectId),
    enabled: !!projectId,
  });
}

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => apiService.getProjectStats(projectId),
    enabled: !!projectId,
  });
}
