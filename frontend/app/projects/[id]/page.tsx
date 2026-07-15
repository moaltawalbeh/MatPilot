"use client";

import { Page } from "@/components/ui/page";
import { CrystalViewer } from "@/components/crystal-viewer";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useProject, useDeleteProject, useJobs, useUploadFile, useProjectFiles, useProjectJobs, useExecuteJob, useJobResult } from "@/hooks/use-api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2, Upload, Play, FileUp, X, Check, AlertTriangle, SlidersHorizontal, FileBarChart, Database, Clock, FileText } from "lucide-react";
import { useCallback, useState, useRef } from "react";

type Tab = "overview" | "experiments" | "analysis" | "results" | "reports" | "references" | "notes" | "history" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "experiments", label: "Experiments" },
  { key: "analysis", label: "Analysis" },
  { key: "results", label: "Results" },
  { key: "reports", label: "Reports" },
  { key: "references", label: "References" },
  { key: "notes", label: "Notes" },
  { key: "history", label: "History" },
  { key: "settings", label: "Settings" },
];

type QueuedFile = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  result?: { file_id: string; detected_format: string; data_points: number; message: string };
  error?: string;
};

function UploadTab({ projectId }: { projectId: string }) {
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
      } catch (err) {
        setFiles((current) =>
          current.map((f) => f.file === item.file ? { ...f, status: "error", error: String(err) } : f),
        );
      }
    }
  }, [files, uploadMutation, projectId]);

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
        {files.length ? (
          files.map((item, idx) => (
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
              <button className="button" onClick={() => remove(idx)} disabled={item.status === "uploading"}>
                <X size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">No files selected.</p>
        )}
      </section>
    </div>
  );
}

function ExperimentsTab({ projectId }: { projectId: string }) {
  const { data: filesData, isLoading } = useProjectFiles(projectId);
  const files = filesData ?? [];

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" /></div>;
  }

  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Uploaded files</h2>
            <span className="muted">{files.length} file{files.length !== 1 ? "s" : ""} in this project</span>
          </div>
        </div>
        {files.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p className="muted">No files uploaded yet. Go to the Experiments tab to upload files.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Format</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.file_id}>
                  <td><strong>{f.filename}</strong></td>
                  <td><span className="badge">{f.detected_format}</span></td>
                  <td>
                    <span className={`badge ${f.is_valid ? "good" : ""}`}>
                      {f.is_valid ? "Valid" : "Invalid"}
                    </span>
                  </td>
                  <td className="muted">{f.uploaded_at.slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function AnalysisTab({ projectId }: { projectId: string }) {
  const { data: jobsData, isLoading } = useProjectJobs(projectId);
  const executeJob = useExecuteJob();
  const jobs = jobsData?.jobs ?? [];
  const activeJob = jobs.find((j) => j.status === "RUNNING") || jobs.find((j) => j.status === "QUEUED");

  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Analysis jobs</h2>
            <span className="muted">{jobs.length} job{jobs.length !== 1 ? "s" : ""} in this project</span>
          </div>
        </div>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" /></div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p className="muted">No analysis jobs yet. Upload a file to get started.</p>
          </div>
        ) : (
          jobs.map((j) => (
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
          ))
        )}
      </section>
    </div>
  );
}

function ResultsTab({ projectId }: { projectId: string }) {
  const { data: jobsData } = useProjectJobs(projectId);
  const jobs = jobsData?.jobs ?? [];
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");

  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Analysis results</h2>
            <span className="muted">{completedJobs.length} completed analysis{completedJobs.length !== 1 ? "es" : ""}</span>
          </div>
        </div>
        {completedJobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p className="muted">No completed analyses yet. Run an analysis to see results here.</p>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}

function ReportsTab({ projectId }: { projectId: string }) {
  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Analysis reports</h2>
            <span className="muted">Generate professional scientific reports</span>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <FileText size={40} color="#80c4ff" style={{ marginBottom: 16 }} />
          <p className="muted">Complete an analysis first, then generate a report from the results.</p>
        </div>
      </section>
    </div>
  );
}

function ReferencesTab() {
  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Reference search</h2>
            <span className="muted">Search crystallographic databases</span>
          </div>
          <Link href="/database" className="button">
            <Database size={15} />
            Open database
          </Link>
        </div>
        <div style={{ textAlign: "center", padding: 40 }}>
          <Database size={40} color="#80c4ff" style={{ marginBottom: 16 }} />
          <p className="muted">Search across COD, Materials Project, OQMD, AFLOW, and more.</p>
        </div>
      </section>
    </div>
  );
}

function NotesTab() {
  const [notes, setNotes] = useState("");
  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Project notes</h2>
            <span className="muted">Document observations and methodology</span>
          </div>
        </div>
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
      </section>
    </div>
  );
}

function HistoryTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: jobsData } = useProjectJobs(projectId);
  const jobs = jobsData?.jobs ?? [];

  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Project history</h2>
            <span className="muted">Activity timeline</span>
          </div>
        </div>
        <div style={{ padding: "16px 0" }}>
          {project && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0" }}>
              <Clock size={16} color="#80c4ff" style={{ marginTop: 2 }} />
              <div>
                <div>Project created</div>
                <div className="muted" style={{ fontSize: 12 }}>{project.created_at.slice(0, 19).replace("T", " ")}</div>
              </div>
            </div>
          )}
          {jobs.map((j) => (
            <div key={j.job_id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid #263545" }}>
              <Clock size={16} color={j.status === "COMPLETED" ? "var(--mint)" : "#80c4ff"} style={{ marginTop: 2 }} />
              <div>
                <div>Job {j.job_id.slice(0, 8)}: {j.job_type} - {j.status}</div>
                <div className="muted" style={{ fontSize: 12 }}>{j.created_at.slice(0, 19).replace("T", " ")}</div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && !project && (
            <p className="muted">No activity yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SettingsTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  return (
    <div>
      <section className="card">
        <div className="section">
          <div>
            <h2>Project settings</h2>
            <span className="muted">Configure project metadata</span>
          </div>
        </div>
        <table className="table" style={{ marginTop: 16 }}>
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
      </section>
    </div>
  );
}

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: project, isLoading } = useProject(id);
  const deleteProject = useDeleteProject();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project?")) return;
    await deleteProject.mutateAsync(id);
    router.push("/projects");
  }, [id, deleteProject, router]);

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
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none",
              border: "none",
              padding: "8px 16px",
              cursor: "pointer",
              color: activeTab === tab.key ? "var(--text)" : "var(--muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--blue)" : "2px solid transparent",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 16 }}>
        {activeTab === "overview" && (
          <div className="grid two">
            <section className="card">
              <div className="section">
                <div>
                  <h2>Pattern data</h2>
                  <span className="muted">{project.files} file{project.files !== 1 ? "s" : ""} uploaded</span>
                </div>
              </div>
              <XrdChart />
            </section>
            <section className="card">
              <div className="section">
                <div>
                  <h2>Structure preview</h2>
                  <span className="muted">Crystal structure viewer</span>
                </div>
              </div>
              <CrystalViewer />
            </section>
          </div>
        )}
        {activeTab === "experiments" && <ExperimentsTab projectId={id} />}
        {activeTab === "analysis" && <AnalysisTab projectId={id} />}
        {activeTab === "results" && <ResultsTab projectId={id} />}
        {activeTab === "reports" && <ReportsTab projectId={id} />}
        {activeTab === "references" && <ReferencesTab />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "history" && <HistoryTab projectId={id} />}
        {activeTab === "settings" && <SettingsTab projectId={id} />}
      </div>
    </Page>
  );
}
