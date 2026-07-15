"use client";

import { Page } from "@/components/ui/page";
import { CrystalViewer } from "@/components/crystal-viewer";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useProject, useDeleteProject, useUploadFile, useProjectFiles, useProjectJobs, useExecuteJob, useProjectExperiments, useJobResult, useJob } from "@/hooks/use-api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2, Play, FileUp, X, Check, AlertTriangle, Clock, FileText, Box, FlaskConical, Upload, Database, FileBarChart, BarChart3, BookOpen, StickyNote, Settings, Activity } from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";

type Tab = "overview" | "experiments" | "files" | "analysis" | "results" | "reports" | "references" | "history" | "notes" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart3 size={14} /> },
  { key: "experiments", label: "Experiments", icon: <FlaskConical size={14} /> },
  { key: "files", label: "Files", icon: <FileUp size={14} /> },
  { key: "analysis", label: "Analysis", icon: <FileBarChart size={14} /> },
  { key: "results", label: "Results", icon: <Check size={14} /> },
  { key: "reports", label: "Reports", icon: <FileText size={14} /> },
  { key: "references", label: "References", icon: <BookOpen size={14} /> },
  { key: "history", label: "History", icon: <Clock size={14} /> },
  { key: "notes", label: "Notes", icon: <StickyNote size={14} /> },
  { key: "settings", label: "Settings", icon: <Settings size={14} /> },
];

type QueuedFile = {
  file: File;
  status: "pending" | "uploading" | "analyzing" | "done" | "error";
  result?: { file_id: string; detected_format: string; data_points: number; experiment_id: string | null; job_id: string | null; message: string };
  error?: string;
  jobId?: string | null;
};

function UploadZone({ projectId, onUploadComplete }: { projectId: string; onUploadComplete?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const uploadMutation = useUploadFile();

  const add = useCallback((list: FileList | null) => {
    if (!list) return;
    setFiles((current) => [
      ...current,
      ...Array.from(list).map((f) => ({ file: f, status: "pending" as const })),
    ]);
  }, []);

  const remove = useCallback((idx: number) => {
    setFiles((current) => current.filter((_, i) => i !== idx));
  }, []);

  const uploadAll = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending");
    for (const item of pending) {
      setFiles((current) =>
        current.map((f) => f.file === item.file ? { ...f, status: "uploading" } : f),
      );
      try {
        const result = await uploadMutation.mutateAsync({ file: item.file, projectId });
        setFiles((current) =>
          current.map((f) => f.file === item.file ? {
            ...f,
            status: result.analysis_started ? "analyzing" : "done",
            result,
            jobId: result.job_id,
          } : f),
        );
        onUploadComplete?.();
      } catch (err) {
        setFiles((current) =>
          current.map((f) => f.file === item.file ? { ...f, status: "error", error: String(err) } : f),
        );
      }
    }
  }, [files, uploadMutation, projectId, onUploadComplete]);

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div>
      <input
        hidden
        ref={input}
        type="file"
        accept=".cif,.raw,.xrdml,.csv,.xy,.txt,.dat"
        multiple
        onChange={(e) => add(e.target.files)}
      />
      <div
        className="drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
      >
        <FileUp size={30} color="#80c4ff" />
        <h2>Drop files here</h2>
        <p>Drag XRD data or CIF files into this project, or select files from your computer.</p>
        <button className="button primary" onClick={() => input.current?.click()}>
          Choose files
        </button>
        <div className="formats">
          {["CIF", "RAW", "XRDML", "CSV", "XY", "TXT", "DAT"].map((x) => (
            <span className="badge" key={x}>{x}</span>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section">
            <div>
              <h2>Upload queue</h2>
              <span className="muted">Analysis starts automatically after upload</span>
            </div>
            {pendingCount > 0 && (
              <button className="button primary" onClick={uploadAll}>
                Upload {pendingCount} file{pendingCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
          {files.map((item, idx) => (
            <div
              key={item.file.name + idx}
              style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #263545", padding: "12px 0" }}
            >
              <FileUp size={17} />
              <div style={{ flex: 1 }}>
                <strong>{item.file.name}</strong>
                <div className="muted">
                  {(item.file.size / 1024).toFixed(1)} KB ·{" "}
                  {item.status === "pending" && "Ready"}
                  {item.status === "uploading" && (
                    <span style={{ color: "var(--blue)" }}>
                      <Loader2 size={12} className="spin" style={{ display: "inline", verticalAlign: "middle" }} /> Uploading...
                    </span>
                  )}
                  {item.status === "analyzing" && item.jobId && (
                    <span style={{ color: "var(--blue)" }}>
                      <Activity size={12} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                      Analysis running — {item.result?.detected_format} · {item.result?.data_points} points
                    </span>
                  )}
                  {item.status === "done" && item.result && (
                    <span style={{ color: "var(--mint)" }}>
                      <Check size={12} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                      {item.result.detected_format} · {item.result.data_points} points
                    </span>
                  )}
                  {item.status === "error" && (
                    <span style={{ color: "#ff6b6b" }}>
                      <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {item.error}
                    </span>
                  )}
                </div>
              </div>
              <button className="button" onClick={() => remove(idx)} disabled={item.status === "uploading" || item.status === "analyzing"}>
                <X size={14} />
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 60,
      textAlign: "center",
    }}>
      {icon && <div style={{ marginBottom: 16, color: "#36516b" }}>{icon}</div>}
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      <p className="muted" style={{ fontSize: 14, maxWidth: 400, marginBottom: 16 }}>{description}</p>
      {action}
    </div>
  );
}

function OverviewTab({ projectId, experiments, files, jobs, latestResult, onNavigate }: {
  projectId: string; experiments: any[]; files: any[]; jobs: any[];
  latestResult: any | null; onNavigate: (tab: Tab) => void
}) {
  const hasData = files.length > 0;
  const runningJobs = jobs.filter((j) => j.status === "RUNNING" || j.status === "QUEUED");
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  const chartData = latestResult?.results?.peaks ? (() => {
    const peaks = latestResult.results.peaks || [];
    if (peaks.length === 0) return undefined;
    const minAngle = Math.min(...peaks.map((p: any) => p.two_theta)) - 5;
    const maxAngle = Math.max(...peaks.map((p: any) => p.two_theta)) + 5;
    return peaks.map((p: any) => ({
      angle: p.two_theta,
      Experimental: p.intensity,
    }));
  })() : undefined;

  const peakMarkers = latestResult?.results?.peaks?.map((p: any) => ({
    two_theta: p.two_theta,
    intensity: p.intensity,
  })) || [];

  return (
    <div>
      <div className="grid metrics" style={{ marginBottom: 16 }}>
        <div className="card">
          <span className="muted">Experiments</span>
          <div className="number">{experiments.length}</div>
          <span className="muted">{experiments.length === 1 ? "experiment" : "experiments"}</span>
        </div>
        <div className="card">
          <span className="muted">Files</span>
          <div className="number">{files.length}</div>
          <span className="muted">{files.length === 1 ? "file" : "files"}</span>
        </div>
        <div className="card">
          <span className="muted">Analyses</span>
          <div className="number">{completedJobs.length}</div>
          <span className="muted">{runningJobs.length} running</span>
        </div>
        <div className="card">
          <span className="muted">Status</span>
          <div className="number" style={{ fontSize: 14 }}>
            {runningJobs.length > 0 ? (
              <span style={{ color: "var(--blue)" }}>
                <Loader2 size={14} className="spin" style={{ display: "inline", verticalAlign: "middle" }} /> Analyzing
              </span>
            ) : hasData ? "Ready" : "No data"}
          </div>
          <span className="muted">{runningJobs.length > 0 ? "Pipeline running" : hasData ? "Ready for analysis" : "Upload to begin"}</span>
        </div>
      </div>

      {runningJobs.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="section">
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={16} className="spin" style={{ color: "var(--blue)" }} />
                Analysis in progress
              </h2>
              <span className="muted">Real-time pipeline progress</span>
            </div>
          </div>
          {runningJobs.map((j) => (
            <div key={j.job_id} style={{ borderTop: "1px solid #263545", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="muted">Job {j.job_id.slice(0, 8)}</span>
                <span className="muted">{Math.round(j.progress)}%</span>
              </div>
              <div style={{ marginTop: 6, height: 4, background: "#263545", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${j.progress}%`, background: "var(--blue)", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
              {j.current_step && (
                <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                  {j.current_step.replace(/_/g, " ")}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="grid two">
        <section className="card">
          <div className="section">
            <div>
              <h2>Diffraction pattern</h2>
              <span className="muted">{chartData ? `${chartData.length} peaks detected` : "No data uploaded"}</span>
            </div>
          </div>
          <XrdChart
            data={chartData}
            peaks={peakMarkers.length > 0 ? peakMarkers : undefined}
            emptyTitle="No diffraction data yet"
            emptyDescription="Upload an XRD pattern file to visualize the diffraction data here."
            emptyAction={
              <button className="button primary" onClick={() => onNavigate("files")}>
                <Upload size={15} /> Upload data
              </button>
            }
          />
        </section>

        <section className="card">
          <div className="section">
            <div>
              <h2>Crystal structure</h2>
              <span className="muted">3D visualization</span>
            </div>
          </div>
          <CrystalViewer
            hasData={false}
            emptyTitle="No crystal structure data"
            emptyDescription="Upload a CIF file to visualize the 3D crystal structure here."
            emptyAction={
              <button className="button primary" onClick={() => onNavigate("files")}>
                <Upload size={15} /> Upload CIF
              </button>
            }
          />
        </section>
      </div>

      {latestResult?.results?.identified_phases && latestResult.results.identified_phases.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section">
            <div>
              <h2>Identified phases</h2>
              <span className="muted">{latestResult.results.identified_phases.length} phases identified</span>
            </div>
            <button className="button" onClick={() => onNavigate("results")}>
              View full results
            </button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Formula</th>
                <th>Confidence</th>
                <th>Match Score</th>
                <th>Matched Peaks</th>
              </tr>
            </thead>
            <tbody>
              {latestResult.results.identified_phases.slice(0, 5).map((phase: any, i: number) => (
                <tr key={i}>
                  <td><strong>{phase.name}</strong></td>
                  <td>{phase.formula}</td>
                  <td>
                    <span className={`badge ${phase.confidence === "High" ? "good" : phase.confidence === "Medium" ? "warn" : ""}`}>
                      {phase.confidence}
                    </span>
                  </td>
                  <td>{(phase.match_score * 100).toFixed(1)}%</td>
                  <td>{phase.matched_peaks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function ExperimentsTab({ experiments, jobs, onUploadClick }: { experiments: any[]; jobs: any[]; onUploadClick: () => void }) {
  if (experiments.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No experiments yet"
          description="Upload your first dataset to start your scientific workflow. Each upload automatically creates an experiment and starts analysis."
          icon={<FlaskConical size={48} />}
          action={
            <div style={{ display: "flex", gap: 12 }}>
              <button className="button primary" onClick={onUploadClick}>
                <Upload size={15} /> Upload XRD Pattern
              </button>
              <button className="button" onClick={onUploadClick}>
                <Box size={15} /> Upload CIF
              </button>
            </div>
          }
        />
        <div style={{ padding: "0 20px 20px", textAlign: "center" }}>
          <div className="formats" style={{ justifyContent: "center" }}>
            {["CIF", "XY", "XRDML", "RAW", "CSV", "TXT", "DAT"].map((x) => (
              <span className="badge" key={x}>{x}</span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Experiments</h2>
          <span className="muted">{experiments.length} experiment{experiments.length !== 1 ? "s" : ""} in this project</span>
        </div>
        <button className="button primary" onClick={onUploadClick}>
          <Upload size={15} /> New experiment
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Data</th>
            <th>Files</th>
            <th>Analyses</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map((exp) => {
            const expJobs = jobs.filter((j) => exp.job_ids?.includes?.(j.job_id));
            const hasResults = expJobs.some((j) => j.status === "COMPLETED");
            return (
              <tr key={exp.id}>
                <td><strong>{exp.name}</strong></td>
                <td>
                  <span className={`badge ${hasResults ? "good" : exp.status === "Analyzing" ? "warn" : ""}`}>
                    {hasResults ? "Complete" : exp.status}
                  </span>
                </td>
                <td>{exp.has_pattern_data ? `${exp.data_points} points` : exp.has_crystal_structure ? "CIF" : "-"}</td>
                <td>{exp.file_ids.length}</td>
                <td>{exp.job_ids.length}</td>
                <td className="muted">{exp.created_at.slice(0, 10)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function FilesTab({ files, experiments, onUploadClick }: { files: any[]; experiments: any[]; onUploadClick: () => void }) {
  if (files.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No files uploaded"
          description="Upload diffraction data files or CIF crystal structures to begin your analysis."
          icon={<FileUp size={48} />}
          action={
            <button className="button primary" onClick={onUploadClick}>
              <Upload size={15} /> Upload files
            </button>
          }
        />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Files</h2>
          <span className="muted">{files.length} file{files.length !== 1 ? "s" : ""}</span>
        </div>
        <button className="button primary" onClick={onUploadClick}>
          <Upload size={15} /> Upload more
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>File Type</th>
            <th>Upload Time</th>
            <th>Parser</th>
            <th>Status</th>
            <th>Linked Experiment</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => {
            const linkedExp = experiments.find((e) => e.file_ids?.includes(f.file_id));
            return (
              <tr key={f.file_id}>
                <td><strong>{f.filename}</strong></td>
                <td><span className="badge">{f.detected_format}</span></td>
                <td className="muted">{f.uploaded_at.slice(0, 19).replace("T", " ")}</td>
                <td className="muted">{f.detected_format}</td>
                <td>
                  <span className={`badge ${f.is_valid ? "good" : ""}`}>
                    {f.is_valid ? "Valid" : "Invalid"}
                  </span>
                </td>
                <td>{linkedExp ? linkedExp.name : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function AnalysisTab({ jobs, experiments, onUploadClick }: { jobs: any[]; experiments: any[]; onUploadClick: () => void }) {
  if (jobs.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No analysis jobs"
          description="Upload a diffraction pattern to automatically start analysis. The system will detect peaks, search references, and identify phases."
          icon={<BarChart3 size={48} />}
          action={
            experiments.length === 0 ? (
              <button className="button primary" onClick={onUploadClick}>
                <Upload size={15} /> Upload data
              </button>
            ) : (
              <p className="muted">Upload more data to start a new analysis</p>
            )
          }
        />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Analysis pipeline</h2>
          <span className="muted">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {jobs.map((j) => {
        const isRunning = j.status === "RUNNING" || j.status === "QUEUED";
        const stepNames: Record<string, string> = {
          validation: "Validating data",
          parsing: "Parsing file",
          peak_detection: "Detecting peaks",
          reference_search: "Searching references",
          phase_identification: "Identifying phases",
          report: "Generating report",
          completed: "Complete",
        };
        return (
          <div
            style={{ borderTop: "1px solid #263545", padding: "14px 0" }}
            key={j.job_id}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{j.job_type}</strong>
                  <span className={`badge ${j.status === "COMPLETED" ? "good" : j.status === "RUNNING" ? "warn" : j.status === "FAILED" ? "bad" : ""}`}>
                    {j.status}
                  </span>
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Job {j.job_id.slice(0, 8)}
                </div>
              </div>
              {isRunning && (
                <div style={{ textAlign: "right" }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {stepNames[j.current_step] || j.current_step} — {Math.round(j.progress)}%
                  </div>
                </div>
              )}
            </div>
            {isRunning && (
              <div style={{ marginTop: 8, height: 4, background: "#263545", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${j.progress}%`, background: "var(--blue)", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            )}
            {j.error && (
              <div style={{ marginTop: 6, color: "#ff6b6b", fontSize: 12 }}>
                {j.error}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ResultsTab({ jobs, experiments }: { jobs: any[]; experiments: any[] }) {
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  if (completedJobs.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No results yet"
          description="Upload a diffraction pattern to automatically analyze it. Results include detected peaks, identified phases, and reference matches."
          icon={<Check size={48} />}
          action={
            <p className="muted">Upload data — analysis starts automatically</p>
          }
        />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Analysis results</h2>
          <span className="muted">{completedJobs.length} completed analysis{completedJobs.length !== 1 ? "es" : ""}</span>
        </div>
      </div>
      {completedJobs.map((j) => (
        <ResultCard key={j.job_id} jobId={j.job_id} />
      ))}
    </section>
  );
}

function ResultCard({ jobId }: { jobId: string }) {
  const { data: result, isLoading } = useJobResult(jobId);

  if (isLoading) {
    return (
      <div style={{ borderTop: "1px solid #263545", padding: "16px 0" }}>
        <Loader2 size={16} className="spin" />
      </div>
    );
  }

  if (!result) return null;

  const phases = result.results?.identified_phases || [];
  const peaks = result.results?.peaks || [];
  const matches = result.results?.reference_matches || [];

  return (
    <div style={{ borderTop: "1px solid #263545", padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <strong>Analysis {jobId.slice(0, 8)}</strong>
          <div className="muted" style={{ fontSize: 12 }}>Completed {result.completed_at?.slice(0, 19).replace("T", " ")}</div>
        </div>
        <span className="badge good">Complete</span>
      </div>

      <div className="grid metrics" style={{ marginBottom: 12, gap: 8 }}>
        <div className="card" style={{ padding: "8px 12px" }}>
          <span className="muted" style={{ fontSize: 11 }}>Peaks</span>
          <div className="number" style={{ fontSize: 20 }}>{peaks.length}</div>
        </div>
        <div className="card" style={{ padding: "8px 12px" }}>
          <span className="muted" style={{ fontSize: 11 }}>Phases</span>
          <div className="number" style={{ fontSize: 20 }}>{phases.length}</div>
        </div>
        <div className="card" style={{ padding: "8px 12px" }}>
          <span className="muted" style={{ fontSize: 11 }}>References</span>
          <div className="number" style={{ fontSize: 20 }}>{matches.length}</div>
        </div>
      </div>

      {phases.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Identified Phases</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Formula</th>
                <th>Confidence</th>
                <th>Score</th>
                <th>Peaks</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase: any, i: number) => (
                <tr key={i}>
                  <td><strong>{phase.name}</strong></td>
                  <td>{phase.formula}</td>
                  <td>
                    <span className={`badge ${phase.confidence === "High" ? "good" : phase.confidence === "Medium" ? "warn" : ""}`}>
                      {phase.confidence}
                    </span>
                  </td>
                  <td>{(phase.match_score * 100).toFixed(1)}%</td>
                  <td>{phase.matched_peaks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {peaks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Detected Peaks</h3>
          <div style={{ maxHeight: 200, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>2θ (°)</th>
                  <th>Intensity</th>
                  <th>FWHM</th>
                  <th>d-spacing (Å)</th>
                </tr>
              </thead>
              <tbody>
                {peaks.slice(0, 20).map((peak: any, i: number) => (
                  <tr key={i}>
                    <td>{peak.two_theta.toFixed(3)}</td>
                    <td>{peak.intensity.toFixed(1)}</td>
                    <td>{peak.fwhm ? peak.fwhm.toFixed(4) : "-"}</td>
                    <td>{peak.d_spacing ? peak.d_spacing.toFixed(4) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {peaks.length > 20 && (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Showing 20 of {peaks.length} peaks
            </div>
          )}
        </div>
      )}

      {result.results?.report && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Report Summary</h3>
          <div className="muted" style={{ fontSize: 13 }}>
            {result.results.report.summary?.top_phase && result.results.report.summary.top_phase !== "Unknown" ? (
              <div>Top identified phase: <strong>{result.results.report.summary.top_phase}</strong></div>
            ) : (
              <div>No clear phase identification — review reference matches above</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsTab({ completedJobs, projectId }: { completedJobs: any[]; projectId: string }) {
  if (completedJobs.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No reports generated"
          description="Complete an analysis to see the scientific report with all findings."
          icon={<FileText size={48} />}
          action={
            <p className="muted">Upload data and wait for analysis to complete</p>
          }
        />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Analysis reports</h2>
          <span className="muted">{completedJobs.length} report{completedJobs.length !== 1 ? "s" : ""} available</span>
        </div>
      </div>
      {completedJobs.map((j) => (
        <ReportCard key={j.job_id} jobId={j.job_id} />
      ))}
    </section>
  );
}

function ReportCard({ jobId }: { jobId: string }) {
  const { data: result } = useJobResult(jobId);
  const report = result?.results?.report;

  if (!report) return null;

  return (
    <div style={{ borderTop: "1px solid #263545", padding: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{report.title}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{report.generated_at?.slice(0, 19).replace("T", " ")}</div>
        </div>
      </div>
      <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
        <div>Total peaks: {report.summary?.total_peaks ?? 0} · Phases identified: {report.summary?.phases_identified ?? 0}</div>
        {report.summary?.top_phase && report.summary.top_phase !== "Unknown" && (
          <div>Top phase: <strong>{report.summary.top_phase}</strong></div>
        )}
      </div>
      {report.methodology && (
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Methodology: {report.methodology.peak_detection} · Tolerance: {report.methodology.tolerance}
        </div>
      )}
    </div>
  );
}

function ReferencesTab() {
  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Reference search</h2>
          <span className="muted">Search 50+ crystallographic materials in local COD database</span>
        </div>
        <Link href="/database" className="button">
          <Database size={15} /> Open database
        </Link>
      </div>
      <EmptyState
        title="Local COD Reference Database"
        description="Contains real diffraction peaks for 50+ common crystalline materials including metals, oxides, carbides, silicates, and more. All peak positions calculated for Cu K-alpha radiation."
        icon={<Database size={48} />}
        action={
          <Link href="/database" className="button primary" style={{ textDecoration: "none" }}>
            <Database size={15} /> Search database
          </Link>
        }
      />
    </section>
  );
}

function HistoryTab({ project, jobs }: { project: any; jobs: any[] }) {
  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Project history</h2>
          <span className="muted">Activity timeline</span>
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {project && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0" }}>
            <Clock size={16} color="#80c4ff" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div>Project created</div>
              <div className="muted" style={{ fontSize: 12 }}>{project.created_at.slice(0, 19).replace("T", " ")}</div>
            </div>
          </div>
        )}
        {jobs.length === 0 ? (
          <p className="muted" style={{ padding: "16px 0" }}>No activity yet. Upload data to get started.</p>
        ) : (
          jobs.map((j) => {
            const statusColor = j.status === "COMPLETED" ? "var(--mint)" : j.status === "RUNNING" ? "var(--blue)" : j.status === "FAILED" ? "#ff6b6b" : "#80c4ff";
            return (
              <div key={j.job_id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #263545" }}>
                <Clock size={16} color={statusColor} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div>Analysis {j.job_id.slice(0, 8)}: <span className={`badge ${j.status === "COMPLETED" ? "good" : ""}`}>{j.status}</span></div>
                  <div className="muted" style={{ fontSize: 12 }}>{j.created_at.slice(0, 19).replace("T", " ")}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function NotesTab() {
  const [notes, setNotes] = useState("");
  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Project notes</h2>
          <span className="muted">Document observations and methodology</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px" }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this project, methodology, observations..."
          style={{
            width: "100%",
            minHeight: 300,
            padding: 16,
            background: "#0d1520",
            border: "1px solid #263545",
            borderRadius: 8,
            color: "var(--text)",
            fontFamily: "inherit",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </div>
    </section>
  );
}

function SettingsTab({ project }: { project: any }) {
  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Project settings</h2>
          <span className="muted">Configure project metadata</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px" }}>
        <table className="table">
          <tbody>
            <tr><td>ID</td><td className="muted">{project?.id}</td></tr>
            <tr><td>Material</td><td>{project?.material || "-"}</td></tr>
            <tr><td>Description</td><td>{project?.description || "-"}</td></tr>
            <tr><td>Status</td><td><span className={`badge ${project?.status === "Complete" ? "good" : ""}`}>{project?.status}</span></td></tr>
            <tr><td>Tags</td><td>{project?.tags.length ? project.tags.join(", ") : "-"}</td></tr>
            <tr><td>Created</td><td className="muted">{project?.created_at.slice(0, 19).replace("T", " ")}</td></tr>
            <tr><td>Updated</td><td className="muted">{project?.updated_at.slice(0, 19).replace("T", " ")}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: project, isLoading, refetch: refetchProject } = useProject(id);
  const deleteProject = useDeleteProject();
  const { data: filesData, refetch: refetchFiles } = useProjectFiles(id);
  const { data: jobsData, refetch: refetchJobs } = useProjectJobs(id);
  const { data: experimentsData, refetch: refetchExperiments } = useProjectExperiments(id);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUpload, setShowUpload] = useState(false);

  const files = filesData ?? [];
  const jobs = jobsData?.jobs ?? [];
  const experiments = experimentsData ?? [];
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");
  const runningJobs = jobs.filter((j) => j.status === "RUNNING" || j.status === "QUEUED");

  const latestCompletedJob = completedJobs.length > 0 ? completedJobs[0] : null;
  const { data: latestResult } = useJobResult(latestCompletedJob?.job_id || "");

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project?")) return;
    await deleteProject.mutateAsync(id);
    router.push("/projects");
  }, [id, deleteProject, router]);

  const handleUploadComplete = useCallback(() => {
    refetchFiles();
    refetchJobs();
    refetchExperiments();
    refetchProject();
  }, [refetchFiles, refetchJobs, refetchExperiments, refetchProject]);

  useEffect(() => {
    if (runningJobs.length > 0) {
      const interval = setInterval(() => {
        refetchJobs();
        refetchExperiments();
        refetchProject();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [runningJobs.length, refetchJobs, refetchExperiments, refetchProject]);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <Page eyebrow="Project" title="Not found" description="This project does not exist.">
        <Link href="/projects" className="button">Back to projects</Link>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="Project · XRD"
      title={project.name}
      description={`${project.material || "No material"} · Updated ${project.updated_at.slice(0, 10)}`}
      actions={
        <button className="button" onClick={handleDelete} style={{ color: "#ff6b6b" }}>
          <Trash2 size={15} /> Delete
        </button>
      }
    >
      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-tab={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "files" || tab.key === "experiments") {
                setShowUpload(true);
              }
            }}
            style={{
              background: "none",
              border: "none",
              padding: "8px 16px",
              cursor: "pointer",
              color: activeTab === tab.key ? "var(--text)" : "var(--muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
              fontFamily: "inherit",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.key === "analysis" && runningJobs.length > 0 && (
              <Loader2 size={12} className="spin" style={{ color: "var(--blue)" }} />
            )}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 16 }}>
        {activeTab === "overview" && (
          <OverviewTab projectId={id} experiments={experiments} files={files} jobs={jobs} latestResult={latestResult} onNavigate={setActiveTab} />
        )}
        {activeTab === "experiments" && (
          <ExperimentsTab
            experiments={experiments}
            jobs={jobs}
            onUploadClick={() => { setActiveTab("files"); setShowUpload(true); }}
          />
        )}
        {activeTab === "files" && (
          <FilesTab
            files={files}
            experiments={experiments}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "analysis" && (
          <AnalysisTab
            jobs={jobs}
            experiments={experiments}
            onUploadClick={() => { setActiveTab("files"); setShowUpload(true); }}
          />
        )}
        {activeTab === "results" && (
          <ResultsTab jobs={jobs} experiments={experiments} />
        )}
        {activeTab === "reports" && (
          <ReportsTab completedJobs={completedJobs} projectId={id} />
        )}
        {activeTab === "references" && <ReferencesTab />}
        {activeTab === "history" && <HistoryTab project={project} jobs={jobs} />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "settings" && <SettingsTab project={project} />}
      </div>

      {showUpload && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: "#101a24",
            border: "1px solid #263545",
            borderRadius: 12,
            width: "100%",
            maxWidth: 600,
            maxHeight: "80vh",
            overflow: "auto",
            padding: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2>Upload to {project.name}</h2>
              <button className="button" onClick={() => setShowUpload(false)}>
                <X size={16} />
              </button>
            </div>
            <UploadZone projectId={id} onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}
    </Page>
  );
}
