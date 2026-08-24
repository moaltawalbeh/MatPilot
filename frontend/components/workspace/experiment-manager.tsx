"use client";

import { useCallback, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Activity,
  Loader2,
  Paperclip,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import {
  useCreateInstrumentExperiment,
  useDeleteInstrumentExperiment,
  useAnalyzeInstrumentExperiment,
} from "@/hooks/use-api";
import type { InstrumentTechnique, WorkspaceExperiment } from "@/types";
import { parseTwoColumnText } from "@/components/workspace/workspace";

export function ExperimentManager({
  projectId,
  technique,
  experiments,
  loading,
  xAxis,
  createPrompt,
  chips,
  openLabel = "Open",
  onOpen,
}: {
  projectId: string;
  technique: InstrumentTechnique;
  experiments: WorkspaceExperiment[];
  loading: boolean;
  xAxis: string;
  createPrompt: string;
  chips: (exp: WorkspaceExperiment) => string[];
  openLabel?: string;
  onOpen: (exp: WorkspaceExperiment) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [pickedFile, setPickedFile] = useState<{
    x: number[];
    y: number[];
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const createExp = useCreateInstrumentExperiment(projectId);
  const deleteExp = useDeleteInstrumentExperiment(projectId);
  const analyzeExp = useAnalyzeInstrumentExperiment(projectId);

  const handlePickFile = useCallback((file: File | undefined) => {
    setPickedFile(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseTwoColumnText(String(reader.result ?? ""));
      if (!parsed) {
        setError("Could not parse file: expected two numeric columns (x, y).");
        return;
      }
      setPickedFile({ ...parsed, name: file.name });
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Experiment name is required.");
      return;
    }
    setError(null);
    try {
      await createExp.mutateAsync({
        technique,
        name: name.trim(),
        material: material.trim(),
        x: pickedFile?.x,
        y: pickedFile?.y,
      });
      setName("");
      setMaterial("");
      setPickedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setShowCreate(false);
    } catch (err) {
      setError(String(err));
    }
  }, [technique, name, material, pickedFile, createExp]);

  const handleDelete = useCallback(
    async (exp: WorkspaceExperiment) => {
      if (!confirm(`Delete experiment "${exp.name}"? This cannot be undone.`)) return;
      setError(null);
      try {
        await deleteExp.mutateAsync({ technique, experimentId: exp.id });
      } catch (err) {
        setError(String(err));
      }
    },
    [technique, deleteExp],
  );

  const handleAnalyze = useCallback(
    async (exp: WorkspaceExperiment) => {
      setError(null);
      try {
        await analyzeExp.mutateAsync({ technique, experimentId: exp.id });
      } catch (err) {
        setError(String(err));
      }
    },
    [technique, analyzeExp],
  );

  return (
    <div>
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "var(--accent-rose)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              placeholder="Experiment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                flex: 1,
                minWidth: 180,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            />
            <input
              placeholder="Material (optional)"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            />
            <button
              className="button"
              onClick={() => fileInput.current?.click()}
              style={{ fontSize: 13 }}
              title={`Attach a two-column (${xAxis} vs signal) file; analysis runs on creation`}
            >
              <Paperclip size={14} />
              {pickedFile ? pickedFile.name : "Upload data file"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.csv,.xy,.dat,text/plain,text/csv"
              style={{ display: "none" }}
              onChange={(e) => handlePickFile(e.target.files?.[0])}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="button primary"
              onClick={handleCreate}
              disabled={createExp.isPending}
              style={{ fontSize: 13 }}
            >
              {createExp.isPending && <Loader2 size={14} className="spin" />}
              <Plus size={14} /> Create &amp; analyze
            </button>
            <button
              className="button"
              onClick={() => {
                setShowCreate(false);
                setError(null);
              }}
              style={{ fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="button primary"
          onClick={() => setShowCreate(true)}
          style={{ fontSize: 13, marginBottom: 16 }}
        >
          <Plus size={14} /> New {technique.toUpperCase()} experiment
        </button>
      )}

      {/* Experiment list */}
      {loading ? (
        <Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : experiments.length === 0 ? (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-default)",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-lg)",
              background: "var(--bg-tertiary)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
            }}
          >
            <FolderOpen size={22} style={{ color: "var(--text-muted)" }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            No {technique.toUpperCase()} experiments yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
            {createPrompt}
          </p>
          <button className="button primary" onClick={() => setShowCreate(true)} style={{ fontSize: 13 }}>
            <Plus size={14} /> Create experiment
          </button>
        </div>
      ) : (
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {experiments.map((exp, idx) => {
            const expChips = chips(exp);
            return (
              <div
                key={exp.id}
                style={{
                  padding: "14px 16px",
                  borderBottom:
                    idx < experiments.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {exp.name}
                    {exp.material && (
                      <span style={{ fontWeight: 400, color: "var(--text-tertiary)", marginLeft: 8 }}>
                        {exp.material}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>
                    {exp.status}
                    {exp.data_points > 0 && ` · ${exp.data_points} pts`}
                    {exp.x_range ? ` · ${exp.x_range[0].toFixed(0)}–${exp.x_range[1].toFixed(0)}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {expChips.map((chip, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 99,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                  {!exp.has_results && technique !== "xrd" && (
                    <button
                      className="button"
                      onClick={() => handleAnalyze(exp)}
                      disabled={analyzeExp.isPending}
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      title="Run analysis engine"
                    >
                      <Activity size={12} /> Analyze
                    </button>
                  )}
                  <button
                    className="button"
                    onClick={() => onOpen(exp)}
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    title={`Open ${openLabel}`}
                  >
                    {openLabel} <ArrowRight size={12} />
                  </button>
                  <button
                    className="button"
                    onClick={() => handleDelete(exp)}
                    style={{ fontSize: 12, padding: "4px 10px", color: "var(--text-muted)" }}
                    title="Delete experiment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
