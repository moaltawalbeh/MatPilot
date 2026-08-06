"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, AlertTriangle, FlaskConical } from "lucide-react";
import { ButtonSpinner } from "../ui/loading";

type SpectrumUploadPanelProps = {
  technique: string;
  accept: string;
  formats: string[];
  sampleId?: string;
  onUploaded: (spectrumId: string, sampleId?: string) => void;
  onUpload: (file: File, sampleId?: string) => Promise<{ id: string; sample_id?: string | null }>;
};

export function SpectrumUploadPanel({ technique, accept, formats, sampleId, onUploaded, onUpload }: SpectrumUploadPanelProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState(sampleId ?? "");

  const validate = useCallback(
    (file: File): string | null => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext && !formats.includes(ext)) return `Unsupported file type: .${ext}. Expected: ${formats.join(", ")}`;
      return null;
    },
    [formats]
  );

  const doUpload = useCallback(
    async (file: File) => {
      setError(null);
      const err = validate(file);
      if (err) {
        setError(err);
        return;
      }
      setLoading(true);
      try {
        const sid = selectedSampleId.trim() || sampleId || undefined;
        const result = await onUpload(file, sid);
        if (input.current) input.current.value = "";
        onUploaded(result.id, result.sample_id ?? sid);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed. Is the backend running?");
      } finally {
        setLoading(false);
      }
    },
    [validate, onUpload, onUploaded, selectedSampleId, sampleId]
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    void doUpload(fileList[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Upload size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>Upload spectrum</h2>
          <span className="muted">Import {technique.toUpperCase()} data as CSV / TXT / DAT</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
            <FlaskConical size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Sample
          </span>
          <input
            type="text"
            value={selectedSampleId}
            onChange={(e) => setSelectedSampleId(e.target.value)}
            placeholder={sampleId ? `Linked to sample ${sampleId}` : "Enter sample ID (optional)"}
            style={{
              padding: "8px 10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-1)",
              color: "var(--text-primary)",
              fontSize: 13,
              outline: "none",
            }}
          />
          {!sampleId && (
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Spectra without a sample ID are still stored, but linking helps the characterization dashboard.
            </span>
          )}
        </label>

        <input ref={input} hidden type="file" accept={accept} onChange={(e) => handleFiles(e.target.files)} />
        <div
          onClick={() => !loading && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "28px 20px",
            border: `2px dashed ${dragOver ? "var(--accent-orange)" : error ? "#ef4444" : "var(--border-default)"}`,
            borderRadius: "var(--radius-lg)",
            background: dragOver ? "rgba(249, 115, 22, 0.05)" : error ? "rgba(239, 68, 68, 0.05)" : "var(--surface-1)",
            textAlign: "center",
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.2s ease",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: error ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)",
              display: "grid",
              placeItems: "center",
              marginBottom: 10,
              color: error ? "#ef4444" : "var(--accent-orange)",
            }}
          >
            {error ? <AlertTriangle size={18} /> : <Upload size={18} />}
          </div>
          {!error && <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>{loading ? "Uploading…" : "Drop your spectrum file here"}</p>}
          {!error && <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 10 }}>{formats.join(" · ").toUpperCase()} · two-column x/y data</p>}
          {error && <p style={{ fontSize: 12.5, color: "#ef4444", lineHeight: 1.5 }}>{error}</p>}
          {!loading && !error && (
            <button className="button primary" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>
              Choose file
            </button>
          )}
          {loading && <ButtonSpinner />}
        </div>
      </div>
    </div>
  );
}
