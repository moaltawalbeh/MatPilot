"use client";

import { Page } from "@/components/ui/page";
import { useStructures, useCreateStructure, useUploadCIFFiles } from "@/hooks/use-api";
import { Upload, Loader2, Search, X, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useState, useRef, useCallback } from "react";

const SOURCE_OPTIONS = ["", "COD", "ICSD", "PubMed", "Custom"];

export default function StructuresPage() {
  const [source, setSource] = useState("");
  const [formula, setFormula] = useState("");
  const [spaceGroup, setSpaceGroup] = useState("");
  const [showImport, setShowImport] = useState(false);
  const { data, isLoading, refetch } = useStructures({ source: source || undefined, formula: formula || undefined, space_group: spaceGroup || undefined });

  const structures: any[] = data?.structures ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Enterprise"
      title="Crystal Structures"
      description="Browse and manage crystal structure reference data and CIF files."
      actions={
        <button className="button primary" onClick={() => setShowImport(true)}>
          <Upload size={15} /> Import CIF
        </button>
      }
    >
      {/* Import CIF Modal */}
      {showImport && (
        <ImportCIFModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); refetch(); }}
        />
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="Search by formula..."
            style={{ width: "100%", paddingLeft: 32 }}
          />
        </div>
        <input
          value={spaceGroup}
          onChange={(e) => setSpaceGroup(e.target.value)}
          placeholder="Space group"
          style={{ flex: "1 1 140px" }}
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Sources</option>
          {SOURCE_OPTIONS.filter(Boolean).map((s) => (
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
              <th>Formula</th>
              <th>Space Group</th>
              <th>Crystal System</th>
              <th>Source</th>
              <th>Peaks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : structures.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🔬</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No crystal structures found</p>
                  <p style={{ fontSize: 13 }}>Import a CIF file or search the COD database to add structures.</p>
                  <button className="button primary" style={{ marginTop: 12 }} onClick={() => setShowImport(true)}>
                    <Upload size={14} /> Import CIF
                  </button>
                </td>
              </tr>
            ) : (
              structures.map((s: any) => (
                <tr key={s.id} style={{ cursor: "pointer" }}>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{s.formula || "—"}</td>
                  <td>{s.space_group || "—"}</td>
                  <td>{s.crystal_system || "—"}</td>
                  <td>
                    <span className={`badge ${s.source === "COD" ? "info" : s.source === "ICSD" ? "good" : ""}`} style={{ fontSize: 10 }}>
                      {s.source || "Custom"}
                    </span>
                  </td>
                  <td>{s.peak_count ?? s.theoretical_peaks?.length ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

function ImportCIFModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<"file" | "text">("file");
  const [cifText, setCifText] = useState("");
  const [structureName, setStructureName] = useState("");
  const [structureFormula, setStructureFormula] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const createMutation = useCreateStructure();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setError("");
    const text = await file.text();
    setCifText(text);
    if (!structureName) {
      const nameFromFilename = file.name.replace(/\.cif$/i, "");
      setStructureName(nameFromFilename);
    }
  }, [structureName]);

  const handleSubmitText = useCallback(async () => {
    if (!cifText.trim()) {
      setError("Please paste CIF content or upload a CIF file.");
      return;
    }
    setError("");
    try {
      const result = await createMutation.mutateAsync({
        name: structureName || "Imported Structure",
        formula: structureFormula || "",
        source: "user_upload",
        cif_text: cifText,
      });
      setResult(result);
    } catch (err: any) {
      setError(err.message || "Import failed");
    }
  }, [cifText, structureName, structureFormula, createMutation]);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Import Crystal Structure (CIF)</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {result ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircle2 size={48} style={{ color: "var(--success)", marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Structure Imported</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>{result.name}</p>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{result.formula} · {result.space_group || "Unknown space group"}</p>
              <button className="button primary" style={{ marginTop: 16 }} onClick={onSuccess}>Done</button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button className={`button ${mode === "file" ? "primary" : ""}`} onClick={() => setMode("file")} style={{ flex: 1 }}>
                  <Upload size={14} /> Upload CIF File
                </button>
                <button className={`button ${mode === "text" ? "primary" : ""}`} onClick={() => setMode("text")} style={{ flex: 1 }}>
                  <FileText size={14} /> Paste CIF Text
                </button>
              </div>

              {/* Metadata fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Name</label>
                  <input value={structureName} onChange={(e) => setStructureName(e.target.value)} placeholder="e.g., LaB6" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Formula</label>
                  <input value={structureFormula} onChange={(e) => setStructureFormula(e.target.value)} placeholder="e.g., LaB6" />
                </div>
              </div>

              {mode === "file" ? (
                <>
                  <div
                    className={`drop ${dragOver ? "active" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                    onClick={() => fileRef.current?.click()}
                    style={{ borderColor: dragOver ? "var(--accent-orange)" : undefined, padding: "32px 24px" }}
                  >
                    <Upload size={28} style={{ color: "var(--text-muted)" }} />
                    <h2 style={{ fontSize: 14, marginTop: 8 }}>Drop CIF file here or click to browse</h2>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Supports .cif files</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".cif" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                  />
                  {cifText && (
                    <div style={{ marginTop: 12, padding: 10, background: "var(--success-bg)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={14} /> CIF file loaded ({cifText.length.toLocaleString()} characters)
                    </div>
                  )}
                </>
              ) : (
                <textarea
                  value={cifText}
                  onChange={(e) => setCifText(e.target.value)}
                  placeholder={"# Paste CIF content here\n_data_block\n_symmetry_space_group_name_H-M   'P m -3 m'\n_cell_length_a   4.156\n..."}
                  style={{ width: "100%", minHeight: 200, fontFamily: "var(--font-mono)", fontSize: 12, resize: "vertical" }}
                />
              )}

              {error && (
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--error-bg)", color: "var(--error)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="modal-footer" style={{ borderTop: "none", paddingTop: 0 }}>
                <button className="button" onClick={onClose}>Cancel</button>
                <button className="button primary" onClick={handleSubmitText} disabled={!cifText.trim() || createMutation.isPending}>
                  {createMutation.isPending ? <><Loader2 size={14} className="spin" /> Importing...</> : "Import Structure"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
