"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, API_URL } from "@/lib/api-client";

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
      qc.invalidateQueries({ queryKey: ["project-experiments"] });
      qc.invalidateQueries({ queryKey: ["project-jobs"] });
      qc.invalidateQueries({ queryKey: ["project-files"] });
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

export function useExperimentData(projectId: string, experimentId: string) {
  return useQuery({
    queryKey: ["experiment-data", projectId, experimentId],
    queryFn: () => apiService.getExperimentData(projectId, experimentId),
    enabled: !!projectId && !!experimentId,
  });
}

// ── Experiment Workspace Hooks ─────────────────────────────────────

export function useExperiment(experimentId: string) {
  return useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => apiService.getExperiment(experimentId),
    enabled: !!experimentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "Analyzing" || status === "Processing") return 2000;
      return false;
    },
  });
}

export function usePhaseIdentification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experimentId, data }: { experimentId: string; data: { query: string; elements?: string[]; limit?: number } }) =>
      apiService.runPhaseIdentification(experimentId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["experiment", variables.experimentId] });
    },
  });
}

export function useExperimentCIFs(experimentId: string) {
  return useQuery({
    queryKey: ["experiment-cifs", experimentId],
    queryFn: () => apiService.listExperimentCIFs(experimentId),
    enabled: !!experimentId,
  });
}

export function useUploadCIFFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experimentId, files }: { experimentId: string; files: File[] }) =>
      apiService.uploadCIFFiles(experimentId, files),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["experiment", variables.experimentId] });
      qc.invalidateQueries({ queryKey: ["experiment-cifs", variables.experimentId] });
    },
  });
}

export function useRunRietveld() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experimentId, data }: { experimentId: string; data: { workflow: "auto" | "upload"; selected_cif_ids?: string[] } }) =>
      apiService.runRietveld(experimentId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["experiment", variables.experimentId] });
    },
  });
}

export function useRunPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experimentId, data }: { experimentId: string; data: { stages?: string[]; stage_params?: Record<string, Record<string, unknown>> } }) =>
      apiService.runPipeline(experimentId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["experiment", variables.experimentId] });
      qc.invalidateQueries({ queryKey: ["pipeline-stages", variables.experimentId] });
    },
  });
}

export function usePipelineStages(experimentId: string) {
  return useQuery({
    queryKey: ["pipeline-stages", experimentId],
    queryFn: () => apiService.getPipelineStages(experimentId),
    enabled: !!experimentId,
  });
}

export function useDownloadPDFReport() {
  return useMutation({
    mutationFn: async (experimentId: string) => {
      const response = await fetch(`${API_URL}/report/generate/${experimentId}`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to generate report");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : "report.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return filename;
    },
  });
}
