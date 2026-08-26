"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  FileBarChart,
  Waves,
  AudioLines,
  Sun,
  Plus,
  Trash2,
  FlaskConical,
  Loader2,
  Search,
  FileDown,
  X,
  Activity,
} from "lucide-react";
import {
  useInstruments,
  useInstrumentExperiments,
  useCreateInstrumentExperiment,
  useDeleteInstrumentExperiment,
  useAnalyzeInstrumentExperiment,
  useInstrumentReferenceSearch,
  useInstrumentReferenceMatch,
  useWorkspaceReport,
} from "@/hooks/use-api";
import type {
  InstrumentTechnique,
  InstrumentSummary,
  WorkspaceExperiment,
} from "@/types";

const TECHNIQUES: Array<{
  id: InstrumentTechnique;
  name: string;
  icon: typeof FileBarChart;
  color: string;
}> = [
  { id: "xrd", name: "XRD", icon: FileBarChart, color: "var(--accent-orange)" },
  { id: "ftir", name: "FTIR", icon: AudioLines, color: "var(--accent-emerald)" },
  { id: "raman", name: "Raman", icon: Waves, color: "var(--accent-cyan)" },
  { id: "uvvis", name: "UV-Vis", icon: Sun, color: "var(--accent-amber)" },
];

function parseTwoColumnText(text: string): { x: number[]; y: number[] } | null {
  const x: number[] = [];
  const y: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/[\s,;\t]+/).filter(Boolean);
    if (parts.length < 2) continue;
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    x.push(a);
    y.push(b);
  }
  if (x.length < 5) return null;
  return { x, y };
}

function summaryChips(exp: WorkspaceExperiment): string[] {
  const s = exp.summary ?? {};
  if (exp.technique === "ftir") {
    const groups = (s.functional_groups as Array<{ group?: string }>) ?? [];
    return groups.slice(0, 3).map((g) => g.group ?? "");
  }
  if (exp.technique === "raman") {
    const top = s.top_match as { material?: string; score?: number } | null;
    return top ? [`${top.material ?? "?"} (${Math.round(top.score ?? 0)})`] : [];
  }
  if (exp.technique === "uvvis") {
    const chips: string[] = [];
    if (typeof s.direct_gap_eV === "number") chips.push(`Eg dir ${s.direct_gap_eV.toFixed(2)} eV`);
    if (typeof s.indirect_gap_eV === "number") chips.push(`Eg ind ${s.indirect_gap_eV.toFixed(2)} eV`);
    return chips;
  }
  if (exp.technique === "xrd" && typeof s.peak_count === "number" && s.peak_count > 0) {
    return [`${s.peak_count} peaks`];
  }
  return [];
}

function ReportPanel({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { data: report, isLoading } = useWorkspaceReport(projectId);
  return (
    <div
      style={{
        marginTop: 16,
        padding: 20,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          Workspace Report
        </h3>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      {isLoading ? (
        <Loader2 size={18} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : report ? (
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <p style={{ marginBottom: 8 }}>
            {report.summary.experiment_count} experiments across{" "}
            {report.summary.technique_count} instruments ({report.summary.analyzed_count} analyzed).
          </p>
          {report.techniques.map((tech) => (
            <div key={tech.technique} style={{ marginBottom: 10 }}>
              <strong style={{ color: "var(--text-primary)" }}>{tech.display_name}</strong>
              <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                {tech.experiments.map((exp) => (
                  <li key={exp.id}>
                    {exp.name}
                    {exp.findings.length > 0 && (
                      <span style={{ color: "var(--text-tertiary)" }}> — {exp.findings.join("; ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <a
            href={`/workspaces/${projectId}/instruments/report/download`}
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 8 }}
          >
            <FileDown size={14} /> Download TXT report
          </a>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>No report available.</p>
      )}
    </div>
  );
}

export default function InstrumentWorkspace({ projectId }: { projectId: string }) {
  const [active, setActive] = useState<InstrumentTechnique>("ftir");
  const [showCreate, setShowCreate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [refQuery, setRefQuery] = useState("");
  const [refSubmitted, setRefSubmitted] = useState("");
  const [matchTarget, setMatchTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<{ x: number[]; y: number[]; name: string } | null>(null);

  const { data: instruments } = useInstruments(projectId);
  const { data: experiments = [], isLoading: loadingExps } = useInstrumentExperiments(projectId, active);
  const createExp = useCreateInstrumentExperiment(projectId);
  const deleteExp = useDeleteInstrumentExperiment(projectId);
  const analyzeExp = useAnalyzeInstrumentExperiment(projectId);
  const { data: refSearch, isLoading: loadingSearch } = useInstrumentReferenceSearch(
    projectId,
    active === "xrd" ? null : active,
    refSubmitted,
  );
  const { data: refMatch, isLoading: loadingMatch } = useInstrumentReferenceMatch(
    projectId,
    active === "xrd" ? null : active,
    matchTarget,
  );

  const summary = useMemo(() => {
    const list: InstrumentSummary[] = instruments ?? [];
    return list.find((s) => s.technique === active);
  }, [instruments, active]);

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
        technique: active,
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
  }, [active, name, material, pickedFile, createExp]);

  const handleDelete = useCallback(
    async (exp: WorkspaceExperiment) => {
      if (!confirm(`Delete experiment "${exp.name}"? This cannot be undone.`)) return;
      setError(null);
      try {
        await deleteExp.mutateAsync({ technique: active, experimentId: exp.id });
        if (matchTarget === exp.id) setMatchTarget(null);
      } catch (err) {
        setError(String(err));
      }
    },
    [active, deleteExp, matchTarget],
  );

  const handleAnalyze = useCallback(
    async (exp: WorkspaceExperiment) => {
      setError(null);
      try {
        await analyzeExp.mutateAsync({ technique: active, experimentId: exp.id });
      } catch (err) {
        setError(String(err));
      }
    },
    [active, analyzeExp],
  );

  const activeColor = TECHNIQUES.find((t) => t.id === active)?.color ?? "var(--accent-orange)";

  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Instrument Workspaces
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            Per-technique experiments: analysis engine + spectral reference library
          </p>
        </div>
        <button
          className="button"
          onClick={() => setShowReport((v) => !v)}
          style={{ fontSize: 13 }}
        >
          <FileDown size={14} /> Workspace Report
        </button>
      </div>

      {/* Technique tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {TECHNIQUES.map((t) => {
          const count = instruments?.find((s) => s.technique === t.id)?.experiment_count ?? 0;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActive(t.id);
                setMatchTarget(null);
                setRefSubmitted("");
                setRefQuery("");
                setShowCreate(false);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${isActive ? t.color : "var(--border-default)"}`,
                background: isActive ? "var(--bg-tertiary)" : "var(--bg-secondary)",
                color: isActive ? t.color : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <t.icon size={15} />
              {t.name}
              {count > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: isActive ? t.color : "var(--bg-tertiary)",
                    color: isActive ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showReport && <ReportPanel projectId={projectId} onClose={() => setShowReport(false)} />}

      {/* Count chips */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Experiments", value: summary?.experiment_count ?? 0 },
          { label: "Analyzed", value: summary?.analyzed_count ?? 0 },
          { label: "With data", value: summary?.data_count ?? 0 },
        ].map((chip) => (
          <div
            key={chip.label}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: activeColor }}>{chip.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{chip.label}</div>
          </div>
        ))}
      </div>

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
              title="Attach a two-column (x y) spectrum file to run analysis on creation"
            >
              {pickedFile ? pickedFile.name : "Attach data"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.csv,.xy,text/plain,text/csv"
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
              {createExp.isPending && <Loader2 size={14} className="spin" />} Create
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
          className="button"
          onClick={() => setShowCreate(true)}
          style={{ fontSize: 13, marginBottom: 16 }}
        >
          <Plus size={14} /> New {active.toUpperCase()} experiment
        </button>
      )}

      {/* Experiment list */}
      {loadingExps ? (
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
            <FlaskConical size={22} style={{ color: "var(--text-muted)" }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            No {active.toUpperCase()} experiments yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
            Create an experiment to analyze a spectrum with the {active.toUpperCase()} engine.
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
            const chips = summaryChips(exp);
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
                  {chips.map((chip, i) => (
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
                  {!exp.has_results && exp.technique !== "xrd" && (
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
                  {exp.technique !== "xrd" && (
                    <button
                      className="button"
                      onClick={() => {
                        setMatchTarget(matchTarget === exp.id ? null : exp.id);
                      }}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        color: matchTarget === exp.id ? "var(--accent-emerald)" : undefined,
                      }}
                    >
                      <Search size={12} /> Match
                    </button>
                  )}
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

      {/* Reference panel (spectral techniques only) */}
      {active !== "xrd" && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Reference Library
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Search reference spectra (e.g. poly, silicon)"
                value={refQuery}
                onChange={(e) => setRefQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setRefSubmitted(refQuery.trim());
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  minWidth: 260,
                }}
              />
              <button
                className="button"
                onClick={() => setRefSubmitted(refQuery.trim())}
                style={{ fontSize: 13 }}
              >
                <Search size={14} /> Search
              </button>
            </div>
          </div>

          {refSubmitted && (
            <div style={{ marginBottom: 12 }}>
              {loadingSearch ? (
                <Loader2 size={16} className="spin" style={{ color: "var(--text-muted)" }} />
              ) : refSearch && refSearch.results.length > 0 ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {refSearch.results.slice(0, 10).map((res) => (
                    <span
                      key={res.reference_id}
                      title={res.formula ?? ""}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 99,
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {res.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                  No reference matches for &ldquo;{refSubmitted}&rdquo;.
                </p>
              )}
            </div>
          )}

          {loadingMatch ? (
            <Loader2 size={16} className="spin" style={{ color: "var(--text-muted)" }} />
          ) : refMatch ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6 }}>
                MATCH RESULTS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {refMatch.matches.slice(0, 5).map((m, i) => (
                  <div
                    key={`${m.reference.reference_id}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        width: 40,
                        textAlign: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 99,
                        background: i === 0 ? "var(--accent-emerald)" : "var(--bg-tertiary)",
                        color: i === 0 ? "#fff" : "var(--text-muted)",
                      }}
                    >
                      {m.score.toFixed(0)}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {m.reference.title}
                    </span>
                    {m.reference.formula && (
                      <span style={{ color: "var(--text-tertiary)" }}>{m.reference.formula}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {matchTarget && (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              Matching selected experiment data against the reference library…
            </p>
          )}
        </div>
      )}
    </section>
  );
}
