"use client";

import { Page } from "@/components/ui/page";
import { useProject, useDeleteProject, useUploadFile, useProjectExperiments, useProjectFiles, useProjectJobs } from "@/hooks/use-api";
import type { UploadResponse } from "@/types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  FlaskConical,
  FileUp,
  X,
  Check,
  AlertTriangle,
  Upload,
  Activity,
  FileBarChart,
  Waves,
  AudioLines,
  Sun,
  Microscope,
  Atom,
  ScanEye,
  Target,
  Thermometer,
  Flame,
  Layers,
  CircleDot,
  Loader2,
  FolderOpen,
  BarChart3,
} from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";

type QueuedFile = {
  file: File;
  status: "pending" | "uploading" | "analyzing" | "done" | "error";
  result?: UploadResponse;
  error?: string;
  jobId?: string | null;
};

const TECHNIQUES = [
  { id: "xrd", name: "X-ray Diffraction", icon: FileBarChart, description: "Crystal structure analysis and phase identification", color: "var(--accent-orange)", available: true },
  { id: "raman", name: "Raman Spectroscopy", icon: Waves, description: "Molecular vibration analysis", color: "var(--accent-cyan)", available: false },
  { id: "ftir", name: "FTIR Spectroscopy", icon: AudioLines, description: "Infrared molecular fingerprinting", color: "var(--accent-emerald)", available: false },
  { id: "uvvis", name: "UV-Vis Spectroscopy", icon: Sun, description: "Optical absorption properties", color: "var(--accent-amber)", available: false },
  { id: "sem", name: "SEM", icon: Microscope, description: "Surface morphology imaging", color: "var(--accent-violet)", available: false },
  { id: "eds", name: "EDS/EDX", icon: Atom, description: "Elemental composition analysis", color: "var(--accent-rose)", available: false },
  { id: "tem", name: "TEM", icon: ScanEye, description: "High-resolution transmission imaging", color: "var(--accent-cyan)", available: false },
  { id: "xps", name: "XPS", icon: Target, description: "Surface chemical state analysis", color: "var(--accent-orange)", available: false },
  { id: "tga", name: "TGA", icon: Thermometer, description: "Thermal stability analysis", color: "var(--accent-emerald)", available: false },
  { id: "dsc", name: "DSC", icon: Flame, description: "Thermal transition analysis", color: "var(--accent-rose)", available: false },
  { id: "bet", name: "BET Surface Area", icon: Layers, description: "Surface area and porosity", color: "var(--accent-violet)", available: false },
  { id: "dls", name: "Dynamic Light Scattering", icon: CircleDot, description: "Particle size distribution", color: "var(--accent-amber)", available: false },
];

function UploadZone({
  projectId,
  onUploadComplete,
  onUploadData,
}: {
  projectId: string;
  onUploadComplete?: () => void;
  onUploadData?: (data: UploadResponse) => void;
}) {
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
        current.map((f) => (f.file === item.file ? { ...f, status: "uploading" } : f)),
      );
      try {
        const result = await uploadMutation.mutateAsync({ file: item.file, projectId });
        setFiles((current) =>
          current.map((f) =>
            f.file === item.file
              ? {
                  ...f,
                  status: result.analysis_started ? "analyzing" : "done",
                  result,
                  jobId: result.job_id,
                }
              : f,
          ),
        );
        onUploadData?.(result);
        onUploadComplete?.();
      } catch (err) {
        setFiles((current) =>
          current.map((f) =>
            f.file === item.file ? { ...f, status: "error", error: String(err) } : f,
          ),
        );
      }
    }
  }, [files, uploadMutation, projectId, onUploadComplete, onUploadData]);

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
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        style={{
          border: "2px dashed var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "48px 24px",
          textAlign: "center",
          background: "var(--bg-secondary)",
          transition:
            "border-color var(--duration-normal) var(--ease-out), background var(--duration-normal) var(--ease-out)",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--radius-lg)",
            background: "rgba(249, 115, 22, 0.1)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 16px",
          }}
        >
          <FileUp size={24} style={{ color: "var(--accent-orange)" }} />
        </div>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 6,
            color: "var(--text-primary)",
          }}
        >
          Drop XRD files here
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
          or click to browse from your computer
        </p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {["XY", "CSV", "RAW", "XRDML", "CIF", "TXT", "DAT"].map((x) => (
            <span
              key={x}
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-tertiary)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-subtle)",
                letterSpacing: "0.03em",
              }}
            >
              {x}
            </span>
          ))}
        </div>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: 2,
                }}
              >
                Upload Queue
              </h4>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                Analysis starts automatically after upload
              </p>
            </div>
            {pendingCount > 0 && (
              <button className="button primary" onClick={uploadAll} style={{ fontSize: 13 }}>
                <Upload size={14} />
                Upload {pendingCount} file{pendingCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
          {files.map((item, idx) => (
            <div
              key={item.file.name + idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: 8,
              }}
            >
              <FileUp
                size={16}
                style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.file.name}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}
                >
                  {(item.file.size / 1024).toFixed(1)} KB
                  {item.status === "pending" && " \u00B7 Ready"}
                  {item.status === "uploading" && (
                    <span style={{ color: "var(--accent-orange)" }}>
                      {" "}
                      &middot;{" "}
                      <Loader2
                        size={11}
                        className="spin"
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      Uploading...
                    </span>
                  )}
                  {item.status === "analyzing" && item.jobId && (
                    <span style={{ color: "var(--accent-orange)" }}>
                      {" "}
                      &middot;{" "}
                      <Activity
                        size={11}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      Analyzing &middot; {item.result?.detected_format} &middot;{" "}
                      {item.result?.data_points} pts
                    </span>
                  )}
                  {item.status === "done" && item.result && (
                    <span style={{ color: "var(--success)" }}>
                      {" "}
                      &middot;{" "}
                      <Check
                        size={11}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      {item.result.detected_format} &middot; {item.result.data_points}{" "}
                      pts
                    </span>
                  )}
                  {item.status === "error" && (
                    <span style={{ color: "var(--error)" }}>
                      {" "}
                      &middot;{" "}
                      <AlertTriangle
                        size={11}
                        style={{ display: "inline", verticalAlign: "middle" }}
                      />{" "}
                      {item.error}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="button"
                onClick={() => remove(idx)}
                disabled={
                  item.status === "uploading" || item.status === "analyzing"
                }
                style={{ padding: "6px", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TechniqueCard({
  technique,
  onClick,
}: {
  technique: (typeof TECHNIQUES)[number];
  onClick: () => void;
}) {
  const Icon = technique.icon;

  return (
    <button
      onClick={onClick}
      disabled={!technique.available}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 12,
        padding: 20,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        cursor: technique.available ? "pointer" : "default",
        textAlign: "left",
        fontFamily: "inherit",
        width: "100%",
        transition:
          "all var(--duration-normal) var(--ease-out)",
        opacity: technique.available ? 1 : 0.55,
      }}
      onMouseEnter={(e) => {
        if (!technique.available) return;
        e.currentTarget.style.borderColor = technique.color;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.2), 0 0 0 1px ${technique.color}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--radius-md)",
          background: technique.available
            ? `${technique.color}15`
            : "var(--bg-tertiary)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon
          size={20}
          style={{
            color: technique.available ? technique.color : "var(--text-muted)",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {technique.name}
          {technique.available ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--accent-emerald)",
                letterSpacing: "0.02em",
              }}
            >
              Available
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: "var(--radius-xs)",
                background: "var(--bg-tertiary)",
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
              }}
            >
              Coming Soon
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            lineHeight: 1.4,
          }}
        >
          {technique.description}
        </div>
      </div>
    </button>
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
  const { data: experimentsData, refetch: refetchExperiments } =
    useProjectExperiments(id);
  const [showUpload, setShowUpload] = useState(false);

  const files = filesData ?? [];
  const jobs = jobsData?.jobs ?? [];
  const experiments = experimentsData ?? [];
  const completedJobs = jobs.filter((j: any) => j.status === "COMPLETED");
  const runningJobs = jobs.filter(
    (j: any) => j.status === "RUNNING" || j.status === "QUEUED",
  );

  const usedTechniques = new Set<string>();
  if (
    completedJobs.length > 0 ||
    files.some(
      (f: any) =>
        f.detected_format === "XY" ||
        f.detected_format === "CSV" ||
        f.detected_format === "RAW",
    )
  ) {
    usedTechniques.add("xrd");
  }
  const techniquesCount = usedTechniques.size;

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await deleteProject.mutateAsync(id);
    router.push("/projects");
  }, [id, deleteProject, router]);

  const handleUploadComplete = useCallback(() => {
    refetchFiles();
    refetchJobs();
    refetchExperiments();
    refetchProject();
  }, [refetchFiles, refetchJobs, refetchExperiments, refetchProject]);

  const handleUploadData = useCallback((_data: UploadResponse) => {}, []);

  const handleTechniqueClick = useCallback(
    (technique: (typeof TECHNIQUES)[number]) => {
      if (technique.available) {
        setShowUpload(true);
      }
    },
    [],
  );

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
        <Loader2
          size={24}
          className="spin"
          style={{ color: "var(--text-muted)" }}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <Page
        eyebrow="Project"
        title="Not found"
        description="This project does not exist or has been deleted."
      >
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Link href="/projects" className="button">
            <ArrowLeft size={15} /> Back to projects
          </Link>
        </div>
      </Page>
    );
  }

  const statusLabel = runningJobs.length > 0 ? "Analyzing" : project.status;
  const statusColor =
    runningJobs.length > 0
      ? "var(--accent-orange)"
      : project.status === "Complete"
        ? "var(--accent-emerald)"
        : "var(--text-secondary)";

  return (
    <Page
      eyebrow={project.material || "Project"}
      title={project.name}
      description={`${project.description || "No description"} \u00B7 ${statusLabel} \u00B7 Updated ${project.updated_at?.slice(0, 10) || ""}`}
      actions={
        <button
          className="button"
          onClick={handleDelete}
          style={{ color: "var(--text-muted)" }}
          title="Delete project"
        >
          <Trash2 size={15} />
        </button>
      }
    >
      {/* ── Back Link ──────────────────────────────────── */}
      <Link
        href="/projects"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          color: "var(--text-tertiary)",
          textDecoration: "none",
          marginBottom: 20,
          transition: "color var(--duration-fast) var(--ease-out)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <ArrowLeft size={14} />
        Back to projects
      </Link>

      {/* ── Status Badge ───────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "var(--radius-sm)",
            background:
              statusColor === "var(--accent-emerald)"
                ? "rgba(16, 185, 129, 0.12)"
                : statusColor === "var(--accent-orange)"
                  ? "rgba(249, 115, 22, 0.10)"
                  : "var(--bg-tertiary)",
            color: statusColor,
          }}
        >
          {runningJobs.length > 0 && (
            <Loader2 size={12} className="spin" />
          )}
          {statusLabel}
        </span>
      </div>

      {/* ── Stats Row ────────────────────────────────── */}
      <div
        className="stats-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          {
            label: "Experiments",
            value: experiments.length,
            icon: FlaskConical,
            color: "var(--accent-orange)",
          },
          {
            label: "Files",
            value: files.length,
            icon: FolderOpen,
            color: "var(--accent-cyan)",
          },
          {
            label: "Techniques",
            value: techniquesCount,
            icon: BarChart3,
            color: "var(--accent-violet)",
          },
          {
            label: "Status",
            value: statusLabel,
            icon: Activity,
            color: statusColor,
            isText: true,
          },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 20px",
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  background: `${stat.color}12`,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <StatIcon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 2,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: stat.isText ? 14 : 22,
                    fontWeight: 700,
                    color: stat.isText
                      ? stat.color
                      : "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.isText ? (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {runningJobs.length > 0 && (
                        <Loader2 size={13} className="spin" />
                      )}
                      {String(stat.value)}
                    </span>
                  ) : (
                    stat.value
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Running Analysis Banner ──────────────────────── */}
      {runningJobs.length > 0 && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            background: "rgba(249, 115, 22, 0.06)",
            border: "1px solid rgba(249, 115, 22, 0.2)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: runningJobs.length > 1 ? 12 : 0,
            }}
          >
            <Loader2
              size={16}
              className="spin"
              style={{ color: "var(--accent-orange)", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-orange)",
              }}
            >
              {runningJobs.length} analysis{" "}
              {runningJobs.length === 1 ? "pipeline" : "pipelines"} running
            </span>
          </div>
          {runningJobs.map((j: any) => (
            <div key={j.job_id} style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {j.current_step
                    ? j.current_step.replace(/_/g, " ")
                    : "Processing"}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {Math.round(j.progress)}%
                </span>
              </div>
              <div
                style={{
                  height: 3,
                  background: "rgba(249, 115, 22, 0.15)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${j.progress}%`,
                    background: "var(--accent-orange)",
                    borderRadius: 2,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Analysis Section ────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Add Characterization Analysis
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Choose a characterization technique to add to this project
          </p>
        </div>
        <div
          className="technique-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {TECHNIQUES.map((technique) => (
            <TechniqueCard
              key={technique.id}
              technique={technique}
              onClick={() => handleTechniqueClick(technique)}
            />
          ))}
        </div>
      </section>

      {/* ── Recent Experiments Table ─────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              Recent Experiments
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              {experiments.length} experiment
              {experiments.length !== 1 ? "s" : ""} in this project
            </p>
          </div>
          {experiments.length > 0 && (
            <button
              className="button"
              onClick={() => setShowUpload(true)}
              style={{ fontSize: 13 }}
            >
              <Upload size={14} /> New Upload
            </button>
          )}
        </div>

        {experiments.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-default)",
              background: "var(--bg-secondary)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-tertiary)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <FlaskConical
                size={24}
                style={{ color: "var(--text-muted)" }}
              />
            </div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 6,
              }}
            >
              No experiments yet
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                maxWidth: 380,
                margin: "0 auto 20px",
                lineHeight: 1.5,
              }}
            >
              Upload your first XRD pattern to start your scientific workflow.
              Each upload creates an experiment automatically.
            </p>
            <button
              className="button primary"
              onClick={() => setShowUpload(true)}
            >
              <Upload size={15} /> Upload your first XRD pattern
            </button>
          </div>
        ) : (
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr>
                    {["Name", "Status", "Data Points", "Created", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "12px 16px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-tertiary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            borderBottom: "1px solid var(--border-subtle)",
                            background: "var(--bg-tertiary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {experiments.slice(0, 10).map((exp: any) => {
                    const expJobs = jobs.filter((j: any) =>
                      exp.job_ids?.includes?.(j.job_id),
                    );
                    const hasResults = expJobs.some(
                      (j: any) => j.status === "COMPLETED",
                    );
                    return (
                      <tr
                        key={exp.id}
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLElement
                          ).style.background = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/projects/${id}/experiments/${exp.id}`}
                            style={{
                              color: "var(--accent-orange)",
                              textDecoration: "none",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {exp.name}
                          </Link>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "3px 8px",
                              borderRadius: "var(--radius-xs)",
                              background: hasResults
                                ? "rgba(16, 185, 129, 0.1)"
                                : exp.status === "Analyzing"
                                  ? "rgba(249, 115, 22, 0.1)"
                                  : "var(--bg-tertiary)",
                              color: hasResults
                                ? "var(--accent-emerald)"
                                : exp.status === "Analyzing"
                                  ? "var(--accent-orange)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {hasResults
                              ? "Complete"
                              : exp.status || "Pending"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {exp.has_pattern_data
                            ? `${exp.data_points} pts`
                            : exp.has_crystal_structure
                              ? "CIF"
                              : "-"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--text-tertiary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {exp.created_at?.slice(0, 10)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Link
                            href={`/projects/${id}/experiments/${exp.id}`}
                            className="button"
                            style={{
                              fontSize: 12,
                              padding: "4px 10px",
                              textDecoration: "none",
                            }}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {experiments.length > 10 && (
              <div
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Showing 10 of {experiments.length} experiments
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Project Activity Timeline ────────────────────── */}
      <section>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Activity
        </h2>
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            padding: "4px 0",
          }}
        >
          {/* Project created event */}
          <div
            style={{
              display: "flex",
              gap: 14,
              padding: "14px 20px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-cyan)",
                flexShrink: 0,
                marginTop: 5,
              }}
            />
            <div>
              <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                Project created
              </div>
              <div
                style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}
              >
                {project.created_at?.slice(0, 19).replace("T", " ")}
              </div>
            </div>
          </div>

          {/* Job events */}
          {jobs.length === 0 ? (
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                No activity yet. Upload data to get started.
              </p>
            </div>
          ) : (
            jobs.slice(0, 10).map((j: any) => {
              const dotColor =
                j.status === "COMPLETED"
                  ? "var(--accent-emerald)"
                  : j.status === "RUNNING"
                    ? "var(--accent-orange)"
                    : j.status === "FAILED"
                      ? "var(--error)"
                      : "var(--accent-cyan)";
              const badgeBg =
                j.status === "COMPLETED"
                  ? "rgba(16, 185, 129, 0.1)"
                  : j.status === "RUNNING"
                    ? "rgba(249, 115, 22, 0.1)"
                    : j.status === "FAILED"
                      ? "rgba(244, 63, 94, 0.1)"
                      : "rgba(6, 182, 212, 0.1)";
              return (
                <div
                  key={j.job_id}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 20px",
                    alignItems: "flex-start",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: dotColor,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
                        Analysis{" "}
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                          }}
                        >
                          {j.job_id.slice(0, 8)}
                        </span>
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-xs)",
                          background: badgeBg,
                          color: dotColor,
                        }}
                      >
                        {j.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {j.created_at?.slice(0, 19).replace("T", " ")}
                      {j.status === "COMPLETED" && j.finished_at && (
                        <span>
                          {" "}
                          &middot; Completed{" "}
                          {j.finished_at.slice(0, 19).replace("T", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {jobs.length > 10 && (
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--border-subtle)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Showing 10 of {jobs.length} events
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Upload Modal ────────────────────────────────── */}
      {showUpload && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUpload(false);
          }}
        >
          <div
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xl)",
              width: "100%",
              maxWidth: 640,
              maxHeight: "80vh",
              overflow: "auto",
              padding: 28,
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 2,
                  }}
                >
                  Upload XRD Data
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  Add diffraction data to {project.name}
                </p>
              </div>
              <button
                className="button"
                onClick={() => setShowUpload(false)}
                style={{ padding: 8, borderRadius: "var(--radius-md)" }}
              >
                <X size={16} />
              </button>
            </div>
            <UploadZone
              projectId={id}
              onUploadComplete={handleUploadComplete}
              onUploadData={handleUploadData}
            />
          </div>
        </div>
      )}

      {/* ── Responsive CSS ────────────────────────────── */}
      <style>{`
        @media (max-width: 1024px) {
          .stats-row, .technique-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .stats-row, .technique-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Page>
  );
}
