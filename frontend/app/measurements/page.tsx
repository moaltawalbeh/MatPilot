"use client";

import { Page } from "@/components/ui/page";
import { useMeasurements, useProjects, useUploadFile } from "@/hooks/use-api";
import { Plus, Loader2, Search, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef, useCallback } from "react";

const STATUS_OPTIONS = ["", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

export default function MeasurementsPage() {
  const [status, setStatus] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const { data, isLoading, refetch } = useMeasurements({ status: status || undefined, sample_id: sampleId || undefined });
  const { data: projects } = useProjects();
  const uploadMutation = useUploadFile();

  const measurements: any[] = data?.measurements ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Enterprise"
      title="Measurements"
      description="Track and manage all laboratory measurements and diffraction data."
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button className="button" onClick={() => setShowUpload(true)}>
            <Upload size={15} /> Upload XRD File
          </button>
          <button className="button primary" onClick={() => setShowUpload(true)}>
            <Plus size={15} /> New Measurement
          </button>
        </div>
      }
    >
      {/* Upload Modal */}
      {showUpload && (
        <UploadMeasurementModal
          projects={projects ?? []}
          uploadMutation={uploadMutation}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); refetch(); }}
        />
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={sampleId}
            onChange={(e) => setSampleId(e.target.value)}
            placeholder="Filter by sample ID..."
            style={{ width: "100%", paddingLeft: 32 }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Sample</th>
              <th>Status</th>
              <th>Instrument</th>
              <th>Data Points</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : measurements.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>📊</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No measurements found</p>
                  <p style={{ fontSize: 13 }}>Upload an XRD file to create a measurement.</p>
                  <button className="button primary" style={{ marginTop: 12 }} onClick={() => setShowUpload(true)}>
                    <Upload size={14} /> Upload XRD File
                  </button>
                </td>
              </tr>
            ) : (
              measurements.map((m: any) => (
                <tr key={m.id} style={{ cursor: "pointer" }}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.sample_name || m.sample_id || "—"}</td>
                  <td>
                    <span
                      className={`badge ${m.status === "COMPLETED" ? "good" : m.status === "FAILED" ? "bad" : m.status === "RUNNING" ? "info" : ""}`}
                      style={{ fontSize: 10 }}
                    >
                      {m.status || "QUEUED"}
                    </span>
                  </td>
                  <td>{m.instrument?.instrument_name || "—"}</td>
                  <td>{m.data_points?.toLocaleString() ?? "—"}</td>
                  <td style={{ color: "var(--text-tertiary)" }}>{m.created_at?.slice(0, 10) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

function UploadMeasurementModal({ projects, uploadMutation, onClose, onSuccess }: {
  projects: any[];
  uploadMutation: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id || "");
  const [dragOver, setDragOver] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (!selectedProject) {
      setError("Please select a project first.");
      return;
    }
    setError("");
    try {
      const result = await uploadMutation.mutateAsync({
        file,
        projectId: selectedProject,
      });
      setUploadResult(result);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
  }, [selectedProject, uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>Upload XRD Measurement File</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {uploadResult ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircle2 size={48} style={{ color: "var(--success)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Upload Successful</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{uploadResult.filename}</p>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {uploadResult.data_points?.toLocaleString()} data points · {uploadResult.detected_format}
              </p>
              {uploadResult.two_theta_range && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  2θ: {uploadResult.two_theta_range[0]?.toFixed(2)}° – {uploadResult.two_theta_range[1]?.toFixed(2)}°
                </p>
              )}
              <button className="button primary" style={{ marginTop: 16 }} onClick={onSuccess}>Done</button>
            </div>
          ) : (
            <>
              {/* Project selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                className={`drop ${dragOver ? "active" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{ borderColor: dragOver ? "var(--accent-orange)" : undefined, background: dragOver ? "var(--accent-orange-bg)" : undefined }}
              >
                <Upload size={32} style={{ color: "var(--text-muted)" }} />
                <h2>Drop XRD file here or click to browse</h2>
                <p>Supports .xrdml, .raw, .xy, .csv, .dat, .txt</p>
                <div className="formats">
                  {["xrdml", "raw", "xy", "csv", "dat", "txt"].map((f) => (
                    <span key={f} className="badge">{f}</span>
                  ))}
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xrdml,.raw,.xy,.csv,.dat,.txt" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              />

              {error && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--error-bg)", color: "var(--error)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {uploadMutation.isPending && (
                <div style={{ marginTop: 12, textAlign: "center", color: "var(--text-secondary)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={16} className="spin" /> Uploading and analyzing...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
