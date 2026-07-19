"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { FlaskConical, Upload, Loader2, CheckCircle2, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useRunRietveld, useUploadCIFFiles } from "@/hooks/use-api";
import { XrdChart } from "@/components/charts/xrd-chart";
import type { CIFFile, RietveldResults } from "@/types";

type RietveldRefinementProps = {
  experimentId: string;
  cifFiles: CIFFile[];
  selectedPhases: CIFFile[];
  rietveldResults: RietveldResults | null;
  onComplete: () => void;
  onDataReady?: (chartData: any[]) => void;
};

export function RietveldRefinement({ experimentId, cifFiles, selectedPhases, rietveldResults, onComplete, onDataReady }: RietveldRefinementProps) {
  const [expanded, setExpanded] = useState(true);
  const [workflow, setWorkflow] = useState<"auto" | "upload">("auto");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rietveldMutation = useRunRietveld();
  const uploadCifMutation = useUploadCIFFiles();
  const isRunning = rietveldMutation.isPending;
  const hasResults = rietveldResults !== null && rietveldResults.status === "completed";

  const autoCifs = cifFiles.filter((c) => c.downloaded && (c.used_for_phase_id ?? false));
  const uploadedCifs = cifFiles.filter((c) => c.uploaded ?? false);

  const chartData = useMemo(() => {
    if (!rietveldResults?.patterns) return [];
    const { two_theta, observed, calculated, difference, background } = rietveldResults.patterns;
    if (!two_theta || !observed || !calculated || !difference || !background) return [];
    const len = Math.min(two_theta.length, observed.length, calculated.length, difference.length, background.length);
    const data = [];
    for (let i = 0; i < len; i++) {
      data.push({
        angle: Math.round(two_theta[i] * 100) / 100,
        Experimental: Math.round((observed[i] ?? 0) * 100) / 100,
        Calculated: Math.round((calculated[i] ?? 0) * 100) / 100,
        Difference: Math.round((difference[i] ?? 0) * 100) / 100,
        Background: Math.round((background[i] ?? 0) * 100) / 100,
      });
    }
    return data;
  }, [rietveldResults]);

  useEffect(() => {
    if (onDataReady && chartData.length > 0) onDataReady(chartData);
  }, [chartData, onDataReady]);

  const toggleCif = (codId: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(codId) ? n.delete(codId) : n.add(codId); return n; });
  };

  const selectAll = () => setSelectedIds(new Set(autoCifs.map((c) => c.cod_id)));

  const handleRunAuto = async () => {
    try { await rietveldMutation.mutateAsync({ experimentId, data: { workflow: "auto", selected_cif_ids: Array.from(selectedIds) } }); onComplete(); } catch {}
  };

  const handleRunUpload = async () => {
    try { await rietveldMutation.mutateAsync({ experimentId, data: { workflow: "upload" } }); onComplete(); } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try { await uploadCifMutation.mutateAsync({ experimentId, files: Array.from(files) }); } catch {}
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <button onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "var(--surface-2)", border: "none", color: "var(--text-primary)", cursor: "pointer", textAlign: "left" }}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center" }}>
          <FlaskConical size={14} style={{ color: "var(--accent-orange)" }} />
        </div>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Rietveld Refinement</span>
        {hasResults && <span className="badge good" style={{ marginLeft: "auto", fontSize: 10 }}>Completed</span>}
      </button>

      {expanded && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          {!hasResults && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setWorkflow("auto")} className={`button ${workflow === "auto" ? "" : "ghost"}`} style={workflow === "auto" ? { borderColor: "var(--accent-orange)", background: "var(--accent-orange-bg)" } : {}}>
                <FlaskConical size={13} /> Downloaded CIFs
              </button>
              <button onClick={() => setWorkflow("upload")} className={`button ${workflow === "upload" ? "" : "ghost"}`} style={workflow === "upload" ? { borderColor: "var(--accent-orange)", background: "var(--accent-orange-bg)" } : {}}>
                <Upload size={13} /> Upload CIFs
              </button>
            </div>
          )}

          {isRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-md)", background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13 }}>
              <Loader2 size={16} className="spin" />
              <div>
                <div style={{ fontWeight: 500 }}>Running Rietveld refinement\u2026</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Least-squares optimization in progress</div>
              </div>
            </div>
          )}

          {!hasResults && !isRunning && workflow === "auto" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Select Phases</div>
              {autoCifs.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", padding: "12px 0" }}>Run Phase Identification first to download candidate CIF files.</div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{autoCifs.length} CIF files</span>
                    <button onClick={selectAll} className="button ghost sm">Select all</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {autoCifs.map((cif) => (
                      <label key={cif.cod_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid " + (selectedIds.has(cif.cod_id) ? "var(--accent-orange-border)" : "var(--border-subtle)"), background: selectedIds.has(cif.cod_id) ? "var(--accent-orange-bg)" : "transparent", cursor: "pointer", fontSize: 13, color: "var(--text-primary)", transition: "all 0.12s ease" }}>
                        <input type="checkbox" checked={selectedIds.has(cif.cod_id)} onChange={() => toggleCif(cif.cod_id)} style={{ accentColor: "var(--accent-orange)" }} />
                        <span style={{ fontWeight: 500 }}>{cif.material_name || "Unknown"}</span>
                        <span style={{ color: "var(--accent-orange)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{cif.material_formula}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{cif.cod_id}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleRunAuto} disabled={selectedIds.size === 0} className="button primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
                    <FlaskConical size={13} /> Start Rietveld ({selectedIds.size} phase{selectedIds.size !== 1 ? "s" : ""})
                  </button>
                </>
              )}
            </div>
          )}

          {!hasResults && !isRunning && workflow === "upload" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Upload CIF Files</div>
              <input ref={fileInputRef} type="file" accept=".cif" multiple onChange={handleFileUpload} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadCifMutation.isPending} className="button" style={{ width: "100%", justifyContent: "center", borderStyle: "dashed", color: "var(--accent-orange)" }}>
                {uploadCifMutation.isPending ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
                {uploadCifMutation.isPending ? "Uploading\u2026" : "Select CIF files (.cif)"}
              </button>
              {uploadedCifs.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Uploaded ({uploadedCifs.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {uploadedCifs.map((cif) => (
                      <div key={cif.cod_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: 12 }}>
                        <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                        <span>{cif.filename || cif.material_name}</span>
                        <span style={{ color: "var(--accent-orange)", fontFamily: "var(--font-mono)" }}>{cif.material_formula}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleRunUpload} className="button primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
                    <FlaskConical size={13} /> Start Rietveld
                  </button>
                </div>
              )}
            </div>
          )}

          {hasResults && rietveldResults && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                <MetricCard label="R_wp" value={rietveldResults.r_wp} unit="%" />
                <MetricCard label="R_p" value={rietveldResults.r_p} unit="%" />
                <MetricCard label="\u03c7\u00b2" value={rietveldResults.chi_squared} />
                <MetricCard label="GoF" value={rietveldResults.gof} />
                <MetricCard label="Iterations" value={rietveldResults.iterations} />
              </div>

              {chartData.length > 0 && (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "10px 16px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Refinement Pattern</div>
                  <div style={{ height: 300 }}><XrdChart data={chartData} /></div>
                </div>
              )}

              {rietveldResults.phases_used?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Phases ({rietveldResults.phases_used.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {rietveldResults.phases_used.map((phase, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: 13 }}>
                        <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
                        <span style={{ fontWeight: 500 }}>{phase.name || phase.formula || "Unknown"}</span>
                        <span style={{ color: "var(--accent-orange)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{phase.formula || ""}</span>
                        {phase.space_group && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{phase.space_group}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--accent-orange)", fontWeight: 600 }}>{((phase.fraction ?? 0) * 100).toFixed(1)}%</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{phase.n_peaks ?? 0} peaks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rietveldResults.parameters && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Refined Parameters</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6 }}>
                    <ParamChip label="Scale" value={rietveldResults.parameters.scale} />
                    <ParamChip label="Zero Shift" value={rietveldResults.parameters.zero_shift} />
                    <ParamChip label="U" value={rietveldResults.parameters.U} />
                    <ParamChip label="V" value={rietveldResults.parameters.V} />
                    <ParamChip label="W" value={rietveldResults.parameters.W} />
                    {rietveldResults.parameters.phase_fractions?.map((f, i) => (
                      <ParamChip key={i} label={`Phase ${i + 1} fraction`} value={f} />
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { setWorkflow("auto"); setSelectedIds(new Set()); }} className="button" style={{ width: "100%", justifyContent: "center" }}>
                <FlaskConical size={13} /> Rerun Refinement
              </button>
            </>
          )}

          {rietveldMutation.isError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--error-bg)", color: "var(--error)", fontSize: 13 }}>
              <AlertCircle size={14} />
              <span>{rietveldMutation.error?.message || "Rietveld refinement failed"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-2)" }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
        {value != null ? <>{typeof value === "number" ? value.toFixed(2) : value}{unit && <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>{unit}</span>}</> : <span style={{ color: "var(--text-muted)" }}>\u2014</span>}
      </div>
    </div>
  );
}

function ParamChip({ label, value }: { label: string; value: number | null | undefined }) {
  let displayValue = "\u2014";
  if (value != null && typeof value === "number" && isFinite(value)) {
    try { displayValue = Math.abs(value) < 0.001 || Math.abs(value) >= 1e6 ? value.toExponential(3) : value.toPrecision(4); } catch { displayValue = String(value); }
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", fontSize: 12 }}>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{displayValue}</span>
    </div>
  );
}
