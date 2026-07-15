"use client";

import { Page } from "@/components/ui/page";
import { FileUp, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import { useUploadFile } from "@/hooks/use-api";
import type { UploadResponse } from "@/types";

type QueuedFile = {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadResponse;
  error?: string;
};

export default function Upload() {
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
        current.map((f) =>
          f.file === item.file ? { ...f, status: "uploading" } : f,
        ),
      );
      try {
        const result = await uploadMutation.mutateAsync({ file: item.file });
        setFiles((current) =>
          current.map((f) =>
            f.file === item.file ? { ...f, status: "done", result } : f,
          ),
        );
      } catch (err) {
        setFiles((current) =>
          current.map((f) =>
            f.file === item.file
              ? { ...f, status: "error", error: String(err) }
              : f,
          ),
        );
      }
    }
  }, [files, uploadMutation]);

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <Page
      eyebrow="Data intake"
      title="Upload diffraction data"
      description="Add experimental patterns or crystal structures to begin an analysis."
      actions={
        pendingCount > 0 ? (
          <button className="button primary" onClick={uploadAll}>
            Upload {pendingCount} file{pendingCount > 1 ? "s" : ""}
          </button>
        ) : undefined
      }
    >
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
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
      >
        <FileUp size={30} color="#80c4ff" />
        <h2>Drop files here</h2>
        <p>
          Drag XRD data or CIF files into this workspace, or select files from
          your computer.
        </p>
        <button
          className="button primary"
          onClick={() => input.current?.click()}
        >
          Choose files
        </button>
        <div className="formats">
          {["CIF", "RAW", "XRDML", "CSV", "XY", "TXT", "DAT"].map((x) => (
            <span className="badge" key={x}>
              {x}
            </span>
          ))}
        </div>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section">
          <div>
            <h2>Upload queue</h2>
            <span className="muted">
              Files are validated before analysis
            </span>
          </div>
        </div>
        {files.length ? (
          files.map((item, idx) => (
            <div
              key={item.file.name + idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderTop: "1px solid #263545",
                padding: "12px 0",
              }}
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
                      <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
                      {item.error}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="button"
                onClick={() => remove(idx)}
                disabled={item.status === "uploading"}
              >
                <X size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted">No files selected.</p>
        )}
      </section>
    </Page>
  );
}
