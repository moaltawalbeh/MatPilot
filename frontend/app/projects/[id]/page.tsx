"use client";

import { Page } from "@/components/ui/page";
import { CrystalViewer } from "@/components/crystal-viewer";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useProject, useDeleteProject, useUploadFile, useProjectFiles, useProjectJobs, useExecuteJob } from "@/hooks/use-api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2, Play, FileUp, X, Check, AlertTriangle, Clock, FileText, Box, FlaskConical, Upload, Database, FileBarChart, BarChart3, BookOpen, StickyNote, Settings } from "lucide-react";
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
  status: "pending" | "uploading" | "done" | "error";
  result?: { file_id: string; detected_format: string; data_points: number; experiment_id: string | null; message: string };
  error?: string;
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
          current.map((f) => f.file === item.file ? { ...f, status: "done", result } : f),
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
              <span className="muted">Files are validated before analysis</span>
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
                  {item.status === "done" && item.result && (
                    <span style={{ color: "var(--mint)" }}>
                      <Check size={12} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                      {item.result.detected_format} · {item.result.data_points} points · Experiment created
                    </span>
                  )}
                  {item.status === "error" && (
                    <span style={{ color: "#ff6b6b" }}>
                      <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {item.error}
                    </span>
                  )}
                </div>
              </div>
              <button className="button" onClick={() => remove(idx)} disabled={item.status === "uploading"}>
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

function OverviewTab({ projectId, experiments, files, jobs, onNavigate }: { projectId: string; experiments: any[]; files: any[]; jobs: any[]; onNavigate: (tab: Tab) => void }) {
  const hasData = files.length > 0;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

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
          <div className="number">{jobs.length}</div>
          <span className="muted">{completedJobs.length} completed</span>
        </div>
        <div className="card">
          <span className="muted">Status</span>
          <div className="number" style={{ fontSize: 14 }}>
            {hasData ? "Data loaded" : "No data"}
          </div>
          <span className="muted">{hasData ? "Ready for analysis" : "Upload to begin"}</span>
        </div>
      </div>

      <div className="grid two">
        <section className="card">
          <div className="section">
            <div>
              <h2>Diffraction pattern</h2>
              <span className="muted">{hasData ? "Experimental data" : "No data uploaded"}</span>
            </div>
          </div>
          <XrdChart
            emptyTitle="No diffraction data yet"
            emptyDescription="Upload an XRD pattern file to visualize the diffraction data here. The pattern will show intensity vs 2θ angles."
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
              <span className="muted">{hasData ? "3D visualization" : "No CIF data"}</span>
            </div>
          </div>
          <CrystalViewer
            hasData={false}
            emptyTitle="No crystal structure data"
            emptyDescription="Upload a CIF file to visualize the 3D crystal structure here. The viewer will display unit cells and atomic positions."
            emptyAction={
              <button className="button primary" onClick={() => onNavigate("files")}>
                <Upload size={15} /> Upload CIF
              </button>
            }
          />
        </section>
      </div>
    </div>
  );
}

function ExperimentsTab({ experiments, onUploadClick }: { experiments: any[]; onUploadClick: () => void }) {
  if (experiments.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No experiments yet"
          description="Start your scientific workflow by uploading your first dataset. Each upload creates an experiment automatically."
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
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Drag & Drop supported</p>
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
          {experiments.map((exp) => (
            <tr key={exp.id}>
              <td><strong>{exp.name}</strong></td>
              <td><span className={`badge ${exp.status === "Complete" ? "good" : ""}`}>{exp.status}</span></td>
              <td>{exp.has_pattern_data ? `${exp.data_points} points` : exp.has_crystal_structure ? "CIF" : "-"}</td>
              <td>{exp.file_ids.length}</td>
              <td>{exp.job_ids.length}</td>
              <td className="muted">{exp.created_at.slice(0, 10)}</td>
            </tr>
          ))}
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
            const linkedExp = experiments.find((e) => e.file_ids.includes(f.file_id));
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
  const executeJob = useExecuteJob();

  if (jobs.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No analysis jobs"
          description="Upload a diffraction pattern to automatically create an analysis job. The system will detect peaks and identify phases."
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
          <h2>Analysis jobs</h2>
          <span className="muted">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {jobs.map((j) => (
        <div
          style={{ borderTop: "1px solid #263545", padding: "14px 0" }}
          key={j.job_id}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <strong>
                {j.job_type}{" "}
                <span className={`badge ${j.status === "COMPLETED" ? "good" : ""}`}>
                  {j.status}
                </span>
              </strong>
              <div className="muted" style={{ marginTop: 4 }}>
                {j.job_id.slice(0, 8)} · {Math.round(j.progress)}% complete
                {j.error && <span style={{ color: "#ff6b6b" }}> · {j.error}</span>}
              </div>
            </div>
            {j.status === "QUEUED" && (
              <button
                className="button primary"
                onClick={() => executeJob.mutate(j.job_id)}
                disabled={executeJob.isPending}
              >
                {executeJob.isPending ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                Run
              </button>
            )}
          </div>
        </div>
      ))}
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
          description="Run an analysis to see peak detection results, phase identification, and reference matches here."
          icon={<Check size={48} />}
          action={
            <p className="muted">Upload data and run an analysis to generate results</p>
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
      <table className="table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            <th>Result</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {completedJobs.map((j) => (
            <tr key={j.job_id}>
              <td><strong>{j.job_id.slice(0, 8)}</strong></td>
              <td>{j.job_type}</td>
              <td><span className="badge good">Complete</span></td>
              <td className="muted">{j.finished_at?.slice(0, 19).replace("T", " ") ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportsTab({ completedJobs }: { completedJobs: any[] }) {
  if (completedJobs.length === 0) {
    return (
      <section className="card">
        <EmptyState
          title="No reports generated"
          description="Complete an analysis first, then generate a professional scientific report from the results."
          icon={<FileText size={48} />}
          action={
            <p className="muted">Run and complete an analysis to enable report generation</p>
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
          <span className="muted">Generate professional scientific reports</span>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: 40 }}>
        <FileText size={40} color="#80c4ff" style={{ marginBottom: 16 }} />
        <p className="muted">Report generation will be available after completing an analysis.</p>
      </div>
    </section>
  );
}

function ReferencesTab() {
  return (
    <section className="card">
      <div className="section">
        <div>
          <h2>Reference search</h2>
          <span className="muted">Search crystallographic databases</span>
        </div>
        <Link href="/database" className="button">
          <Database size={15} /> Open database
        </Link>
      </div>
      <EmptyState
        title="Search reference databases"
        description="Search across COD, Materials Project, OQMD, AFLOW, Materials Cloud, and NOMAD to identify crystalline phases."
        icon={<Database size={48} />}
        action={
          <Link href="/database" className="button primary" style={{ textDecoration: "none" }}>
            <Database size={15} /> Open database
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
          jobs.map((j) => (
            <div key={j.job_id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #263545" }}>
              <Clock size={16} color={j.status === "COMPLETED" ? "var(--mint)" : "#80c4ff"} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div>Job {j.job_id.slice(0, 8)}: {j.job_type} - {j.status}</div>
                <div className="muted" style={{ fontSize: 12 }}>{j.created_at.slice(0, 19).replace("T", " ")}</div>
              </div>
            </div>
          ))
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
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showUpload, setShowUpload] = useState(false);

  const files = filesData ?? [];
  const jobs = jobsData?.jobs ?? [];
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project?")) return;
    await deleteProject.mutateAsync(id);
    router.push("/projects");
  }, [id, deleteProject, router]);

  const handleUploadComplete = useCallback(() => {
    refetchFiles();
    refetchJobs();
    refetchProject();
  }, [refetchFiles, refetchJobs, refetchProject]);

  const experiments = files.map((f: any, i: number) => ({
    id: f.file_id,
    name: f.filename,
    status: "Uploaded",
    has_pattern_data: f.detected_format !== "CIF",
    has_crystal_structure: f.detected_format === "CIF",
    data_points: 0,
    file_ids: [f.file_id],
    job_ids: [],
    created_at: f.uploaded_at,
  }));

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
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 16 }}>
        {activeTab === "overview" && (
          <OverviewTab projectId={id} experiments={experiments} files={files} jobs={jobs} onNavigate={setActiveTab} />
        )}
        {activeTab === "experiments" && (
          <ExperimentsTab
            experiments={experiments}
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
          <ReportsTab completedJobs={completedJobs} />
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
