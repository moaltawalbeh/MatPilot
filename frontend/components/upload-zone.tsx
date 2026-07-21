"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";

type UploadZoneProps = {
  accept?: string;
  maxSize?: number;
  onUpload: (file: File) => void | Promise<void>;
  multiple?: boolean;
  label?: string;
  description?: string;
};

export function UploadZone({ accept, maxSize, onUpload, multiple = false, label = "Drop files here", description }: UploadZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((file: File): string | null => {
    if (accept) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowed = accept.split(",").map((s) => s.trim().replace(".", "").toLowerCase());
      if (ext && !allowed.includes(ext)) return `Unsupported file type: .${ext}`;
    }
    if (maxSize && file.size > maxSize) return `File exceeds ${(maxSize / (1024 * 1024)).toFixed(0)} MB limit`;
    return null;
  }, [accept, maxSize]);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const files = multiple ? Array.from(fileList) : [fileList[0]];
    for (const file of files) { const err = validate(file); if (err) { setError(err); return; } }
    setLoading(true);
    try { for (const file of files) { await onUpload(file); } }
    catch (e) { setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setLoading(false); if (input.current) input.current.value = ""; }
  }, [multiple, validate, onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input ref={input} hidden type="file" accept={accept} multiple={multiple} onChange={(e) => handleFiles(e.target.files)} />
      <div onClick={() => !loading && input.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", border: `2px dashed ${dragOver ? "var(--accent-orange)" : error ? "var(--error, #ef4444)" : "var(--border-default)"}`, borderRadius: "var(--radius-lg)", background: dragOver ? "rgba(249, 115, 22, 0.05)" : error ? "rgba(239, 68, 68, 0.05)" : loading ? "var(--surface-2)" : "var(--surface-1)", textAlign: "center", cursor: loading ? "wait" : "pointer", transition: "all 0.2s ease", opacity: loading ? 0.7 : 1 }}>
        <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: error ? "rgba(239, 68, 68, 0.1)" : "rgba(249, 115, 22, 0.1)", display: "grid", placeItems: "center", marginBottom: 12, color: error ? "var(--error, #ef4444)" : "var(--accent-orange)" }}>
          {error ? <AlertTriangle size={20} /> : <Upload size={20} />}
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{error ? "Upload error" : label}</h3>
        <p style={{ fontSize: 13, color: error ? "var(--error, #ef4444)" : "var(--text-tertiary)", maxWidth: 360, lineHeight: 1.5, marginBottom: 12 }}>{error || description || "Drag files here or click to browse"}</p>
        {!error && !loading && <button className="button primary" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>Choose files</button>}
      </div>
    </div>
  );
}
