"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, API_URL } from "@/lib/api-client";
import type { RefinementParameter, ManualRefinementSession } from "@/types";

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

// ── Enterprise Platform Hooks ───────────────────────────────────────

// ── Samples ──────────────────────────────────────────────────────
export function useSamples(params?: { status?: string; tags?: string[]; search?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["samples", params],
    queryFn: () => apiService.listSamples(params),
  });
}

export function useSample(id: string) {
  return useQuery({
    queryKey: ["samples", id],
    queryFn: () => apiService.getSample(id),
    enabled: !!id,
  });
}

export function useCreateSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createSample,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["samples"] }),
  });
}

export function useUpdateSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; formula?: string; description?: string; status?: string; crystal_system?: string; tags?: string[] }) =>
      apiService.updateSample(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["samples"] });
      qc.invalidateQueries({ queryKey: ["samples", vars.id] });
    },
  });
}

export function useDeleteSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteSample,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["samples"] }),
  });
}

// ── Measurements ─────────────────────────────────────────────────
export function useMeasurements(params?: { sample_id?: string; status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["measurements", params],
    queryFn: () => apiService.listMeasurements(params),
  });
}

export function useMeasurement(id: string) {
  return useQuery({
    queryKey: ["measurements", id],
    queryFn: () => apiService.getMeasurement(id),
    enabled: !!id,
  });
}

export function useCreateMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createMeasurement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      qc.invalidateQueries({ queryKey: ["samples"] });
    },
  });
}

export function useUpdateMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; status?: string }) =>
      apiService.updateMeasurement(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["measurements"] });
      qc.invalidateQueries({ queryKey: ["measurements", vars.id] });
    },
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteMeasurement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["measurements"] }),
  });
}

// ── Crystal Structures ───────────────────────────────────────────
export function useStructures(params?: { source?: string; formula?: string; space_group?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["structures", params],
    queryFn: () => apiService.listStructures(params),
  });
}

export function useStructure(id: string) {
  return useQuery({
    queryKey: ["structures", id],
    queryFn: () => apiService.getStructure(id),
    enabled: !!id,
  });
}

export function useCreateStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createStructure,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["structures"] }),
  });
}

export function useUpdateStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; formula?: string; tags?: string[] }) =>
      apiService.updateStructure(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["structures"] });
      qc.invalidateQueries({ queryKey: ["structures", vars.id] });
    },
  });
}

export function useDeleteStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteStructure,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["structures"] }),
  });
}

export function useImportStructureCIF() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cifText, source, sourceId }: { cifText: string; source?: string; sourceId?: string }) =>
      apiService.importStructureCIF(cifText, source, sourceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["structures"] }),
  });
}

// ── Collections ──────────────────────────────────────────────────
export function useCollections(params?: { collection_type?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["collections", params],
    queryFn: () => apiService.listCollections(params),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => apiService.getCollection(id),
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createCollection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; is_public?: boolean }) =>
      apiService.updateCollection(id, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collections", vars.id] });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteCollection,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useAddSampleToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, sampleId }: { collectionId: string; sampleId: string }) =>
      apiService.addSampleToCollection(collectionId, sampleId),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collections", vars.collectionId] });
    },
  });
}

// ── Downloads ────────────────────────────────────────────────────
export function useDownloads(params?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["downloads", params],
    queryFn: () => apiService.listDownloads(params),
  });
}

export function useRequestDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.requestDownload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

export function useDeleteDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteDownload,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["downloads"] }),
  });
}

// ── Notifications ────────────────────────────────────────────────
export function useNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => apiService.listNotifications(params),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await apiService.listNotifications({ unread_only: true, limit: 1 });
      return res.unread_count;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// ── Search Configs ───────────────────────────────────────────────
export function useSearchConfigs(params?: { search_type?: string; limit?: number }) {
  return useQuery({
    queryKey: ["search-configs", params],
    queryFn: () => apiService.listSearchConfigs(params),
  });
}

export function useCreateSearchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.createSearchConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-configs"] }),
  });
}

export function useDeleteSearchConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiService.deleteSearchConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-configs"] }),
  });
}

// ── Activity ─────────────────────────────────────────────────────
export function useActivities(params?: { project_id?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["activities", params],
    queryFn: () => apiService.listActivities(params),
  });
}

// ── Dashboard ────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: apiService.getDashboardStats,
    refetchInterval: 60_000,
  });
}

// ── Admin / Users ────────────────────────────────────────────────
export function useUsers(params?: { role?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => apiService.listUsers(params),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: string; status?: string }) =>
      apiService.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ── Global Search ────────────────────────────────────────────────
export function useGlobalSearch(query: string, type?: string) {
  return useQuery({
    queryKey: ["global-search", query, type],
    queryFn: () => apiService.globalSearch({ q: query, type, limit: 20 }),
    enabled: query.length >= 2,
  });
}

// ── Manual Refinement Hooks ──────────────────────────────────────

export function useManualRefinement(sessionId: string | null) {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ["manual-refinement", sessionId],
    queryFn: () => apiService.getManualRefinement(sessionId!),
    enabled: !!sessionId,
  });

  const initMutation = useMutation({
    mutationFn: apiService.initManualRefinement,
  });

  const setParamMutation = useMutation({
    mutationFn: ({ paramName, data }: { paramName: string; data: { value?: number; locked?: boolean } }) =>
      apiService.setRefinementParameter(sessionId!, paramName, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const lockMutation = useMutation({
    mutationFn: (paramNames: string[]) =>
      apiService.lockRefinementParameters(sessionId!, paramNames),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const unlockMutation = useMutation({
    mutationFn: (paramNames: string[]) =>
      apiService.unlockRefinementParameters(sessionId!, paramNames),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const stepMutation = useMutation({
    mutationFn: () => apiService.runRefinementStep(sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const fullRefinementMutation = useMutation({
    mutationFn: () => apiService.runFullRefinement(sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const undoMutation = useMutation({
    mutationFn: () => apiService.undoRefinementStep(sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => apiService.resetRefinement(sessionId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manual-refinement", sessionId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiService.deleteRefinementSession(sessionId!),
  });

  return {
    session,
    initMutation,
    setParamMutation,
    lockMutation,
    unlockMutation,
    stepMutation,
    fullRefinementMutation,
    undoMutation,
    resetMutation,
    deleteMutation,
  };
}

export function useRefinementParameters() {
  return useQuery({
    queryKey: ["refinement-parameters"],
    queryFn: apiService.getRefinementParameters,
  });
}
