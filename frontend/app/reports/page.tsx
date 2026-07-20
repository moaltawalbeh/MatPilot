"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useDownloadPDFReport } from "@/hooks/use-api";
import { apiService } from "@/lib/api-client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Download, Printer, Share2, FileCode, FileJson, FileSpreadsheet, CheckCircle2, Loader2, ChevronDown, ChevronRight, FlaskConical, Clock } from "lucide-react";

type ExportFormat = "pdf" | "html" | "cif" | "json" | "csv";

const exportFormats: { key: ExportFormat; label: string; description: string; icon: typeof FileText; available: boolean }[] = [
  { key: "pdf", label: "PDF Report", description: "Formatted scientific report with figures, tables, and methodology", icon: FileText, available: true },
  { key: "html", label: "HTML Report", description: "Interactive web-based report with embedded charts", icon: FileCode, available: true },
  { key: "json", label: "JSON Data", description: "Machine-readable results, parameters, and patterns", icon: FileJson, available: true },
  { key: "csv", label: "CSV Export", description: "Tabular data for peak lists, phases, and refinement parameters", icon: FileSpreadsheet, available: true },
  { key: "cif", label: "CIF Files", description: "Crystallographic Information Files for identified phases", icon: FlaskConical, available: false },
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadReport(content: string, filename: string, mimeType: string) {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

export default function ReportsPage() {
  const { data: projects, isLoading } = useProjects();
  const allProjects = projects ?? [];
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const downloadPdf = useDownloadPDFReport();

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleExport = async (format: ExportFormat, projectName: string, projectId?: string) => {
    const key = `${format}-${projectName}`;
    setExporting(key);
    setExportSuccess(null);
    try {
      const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      let projectExps: { id: string; name?: string; status?: string; data_points?: number; detected_peaks?: unknown[]; rietveld_results?: Record<string, unknown>; candidate_phases?: unknown[] }[] = [];
      if (projectId) {
        try {
          projectExps = (await apiService.listProjectExperiments(projectId)) as unknown as typeof projectExps;
        } catch { /* ignore */ }
      }
      const firstExp = projectExps?.[0];
      if (format === "pdf") {
        if (projectId) {
          try {
            const experiments: { id: string }[] = await apiService.listProjectExperiments(projectId) as unknown as { id: string }[];
            if (experiments && experiments.length > 0) {
              const blob = await apiService.downloadReport(experiments[0].id);
              const disposition = ""; // server doesn't set it for this endpoint
              const filename = `${safeName}_report.pdf`;
              downloadBlob(blob, filename);
            } else {
              throw new Error("No experiments found in this project");
            }
          } catch (err) {
            const project = allProjects.find((p) => p.name === projectName);
            downloadReport(`MATPILOT Scientific Report\nProject: ${projectName}\nMaterial: ${project?.material || "N/A"}\nGenerated: ${new Date().toISOString()}\n\nNote: No experiment data available for PDF generation. Run an analysis first.`, `${safeName}_report.txt`, "text/plain");
          }
        }
      } else if (format === "html") {
        const peaks = (firstExp?.detected_peaks || []) as { two_theta: number; intensity: number; d_spacing?: number; fwhm?: number }[];
        const phases = (firstExp?.candidate_phases || []) as { material_name: string; material_formula: string; match_score: number; confidence: string; matched_peaks: number }[];
        const rv = firstExp?.rietveld_results as Record<string, unknown> | undefined;
        const rvParams = rv?.parameters as Record<string, unknown> | undefined;
        const htmlParts = [
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${projectName} — MatPilot Report</title>`,
          `<style>body{font-family:Inter,system-ui,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1a1a2e;line-height:1.6}`,
          `h1{color:#f97316;border-bottom:2px solid #f97316;padding-bottom:8px}h2{color:#334155;margin-top:32px}`,
          `table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px}`,
          `th{background:#f8fafc;font-weight:600}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}`,
          `.good{background:#d1fae5;color:#065f46}.info{background:#dbeafe;color:#1e40af}</style></head><body>`,
          `<h1>${projectName}</h1>`,
          `<p><strong>Material:</strong> ${firstExp?.name || "N/A"} &nbsp;|&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()} &nbsp;|&nbsp; <strong>Generator:</strong> MatPilot</p>`,
        ];
        if (peaks.length > 0) {
          htmlParts.push(`<h2>Detected Peaks (${peaks.length})</h2><table><thead><tr><th>2θ (°)</th><th>Intensity</th><th>d-spacing (Å)</th><th>FWHM (°)</th></tr></thead><tbody>`);
          peaks.slice(0, 50).forEach((p) => {
            htmlParts.push(`<tr><td>${p.two_theta.toFixed(3)}</td><td>${p.intensity.toFixed(1)}</td><td>${p.d_spacing?.toFixed(4) || "—"}</td><td>${p.fwhm?.toFixed(3) || "—"}</td></tr>`);
          });
          if (peaks.length > 50) htmlParts.push(`<tr><td colspan="4" style="text-align:center;color:#888">…and ${peaks.length - 50} more peaks</td></tr>`);
          htmlParts.push(`</tbody></table>`);
        }
        if (phases.length > 0) {
          htmlParts.push(`<h2>Phase Identification (${phases.length} candidates)</h2><table><thead><tr><th>Rank</th><th>Material</th><th>Formula</th><th>Score</th><th>Confidence</th><th>Matched Peaks</th></tr></thead><tbody>`);
          phases.forEach((p, i) => {
            const confClass = p.confidence === "High" ? "good" : "info";
            htmlParts.push(`<tr><td>${i + 1}</td><td>${p.material_name}</td><td>${p.material_formula}</td><td>${p.match_score.toFixed(3)}</td><td><span class="badge ${confClass}">${p.confidence}</span></td><td>${p.matched_peaks}</td></tr>`);
          });
          htmlParts.push(`</tbody></table>`);
        }
        if (rv) {
          htmlParts.push(`<h2>Rietveld Refinement</h2><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>`);
          htmlParts.push(`<tr><td>R<sub>wp</sub></td><td>${(rv.r_wp as number)?.toFixed(2) || "—"}</td></tr>`);
          htmlParts.push(`<tr><td>R<sub>p</sub></td><td>${(rv.r_p as number)?.toFixed(2) || "—"}</td></tr>`);
          htmlParts.push(`<tr><td>R<sub>exp</sub></td><td>${(rv.r_exp as number)?.toFixed(2) || "—"}</td></tr>`);
          htmlParts.push(`<tr><td>χ²</td><td>${(rv.chi_squared as number)?.toFixed(3) || "—"}</td></tr>`);
          htmlParts.push(`<tr><td>GoF</td><td>${(rv.gof as number)?.toFixed(3) || "—"}</td></tr>`);
          htmlParts.push(`</tbody></table>`);
          if (rvParams) {
            htmlParts.push(`<h2>Refinement Parameters</h2><table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>`);
            htmlParts.push(`<tr><td>Scale</td><td>${(rvParams.scale as number)?.toFixed(4) || "—"}</td></tr>`);
            htmlParts.push(`<tr><td>Zero Shift</td><td>${(rvParams.zero_shift as number)?.toFixed(4) || "—"}</td></tr>`);
            htmlParts.push(`</tbody></table>`);
          }
        }
        htmlParts.push(`<hr><p style="color:#888;font-size:12px">Generated by MatPilot — Scientific XRD Analysis Platform</p></body></html>`);
        downloadReport(htmlParts.join("\n"), `${safeName}_report.html`, "text/html");
      } else if (format === "json") {
        const jsonData: Record<string, unknown> = {
          report: { project: projectName, generated_at: new Date().toISOString(), generator: "MatPilot" },
          experiment: firstExp ? { id: firstExp.id, name: firstExp.name, status: firstExp.status, data_points: firstExp.data_points } : null,
          detected_peaks: firstExp?.detected_peaks || [],
          candidate_phases: firstExp?.candidate_phases || [],
          rietveld_results: firstExp?.rietveld_results || null,
        };
        downloadReport(JSON.stringify(jsonData, null, 2), `${safeName}_results.json`, "application/json");
      } else if (format === "csv") {
        const peaks = (firstExp?.detected_peaks || []) as { two_theta: number; intensity: number; d_spacing?: number; fwhm?: number; area?: number; hkl?: string }[];
        const phases = (firstExp?.candidate_phases || []) as { material_name: string; material_formula: string; match_score: number; confidence: string; matched_peaks: number; cosine_similarity?: number }[];
        const csvLines: string[] = [];
        if (peaks.length > 0) {
          csvLines.push("# Detected Peaks");
          csvLines.push("two_theta,intensity,d_spacing,fwhm,area,hkl");
          peaks.forEach((p) => {
            csvLines.push(`${p.two_theta.toFixed(4)},${p.intensity.toFixed(2)},${p.d_spacing?.toFixed(4) || ""},${p.fwhm?.toFixed(4) || ""},${p.area?.toFixed(2) || ""},${p.hkl || ""}`);
          });
          csvLines.push("");
        }
        if (phases.length > 0) {
          csvLines.push("# Phase Identification Candidates");
          csvLines.push("rank,material_name,formula,match_score,confidence,matched_peaks,cosine_similarity");
          phases.forEach((p, i) => {
            csvLines.push(`${i + 1},"${p.material_name}","${p.material_formula}",${p.match_score.toFixed(4)},${p.confidence},${p.matched_peaks},${p.cosine_similarity?.toFixed(4) || ""}`);
          });
        }
        if (csvLines.length === 0) {
          csvLines.push("No data available. Run an analysis first.");
        }
        downloadReport(csvLines.join("\n"), `${safeName}_data.csv`, "text/csv");
      }
      setExportSuccess(key);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setExportSuccess(null), 2000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Page
      eyebrow="Reporting"
      title="Reports"
      description="Build and export shareable records from analysis-ready scientific results."
      actions={<Link href="/projects" className="button primary" style={{ textDecoration: "none" }}><FileText size={15} /> New report</Link>}
    >
      {/* Export Formats */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="section">
          <div><h2>Export Formats</h2><span className="muted">Choose a format for your scientific report</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, padding: "0 20px 20px" }}>
          {exportFormats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <div key={fmt.key} style={{ padding: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", opacity: fmt.available ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: fmt.available ? "var(--accent-orange)" : "var(--text-muted)" }} />
                  <strong style={{ fontSize: 13 }}>{fmt.label}</strong>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-tertiary)", margin: 0 }}>{fmt.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Project Reports */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : allProjects.length === 0 ? (
        <section className="card" style={{ textAlign: "center", padding: 40 }}>
          <FlaskConical size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.4 }} />
          <p className="muted" style={{ fontSize: 13 }}>No projects yet. Create a project and run an analysis to generate reports.</p>
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allProjects.map((project) => {
            const isExpanded = expandedProject === project.id;
            return (
              <section className="card" key={project.id}>
                <button onClick={() => setExpandedProject(isExpanded ? null : project.id)} style={{ display: "flex", width: "100%", alignItems: "center", gap: 12, background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "14px 20px", textAlign: "left" }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{project.name}</strong>
                      <span className={`badge ${project.status === "Active" ? "info" : project.status === "Complete" ? "good" : ""}`} style={{ fontSize: 10 }}>{project.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {project.material || "No material"} · {project.experiments} experiment{project.experiments !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {new Date(project.updated_at).toLocaleDateString()}
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "14px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                      {exportFormats.filter((f) => f.available).map((fmt) => {
                        const Icon = fmt.icon;
                        const key = `${fmt.key}-${project.name}`;
                        return (
                          <button key={fmt.key} className="button" disabled={exporting === key} onClick={() => handleExport(fmt.key, project.name, project.id)} style={{ justifyContent: "space-between", padding: "8px 12px", fontSize: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon size={12} />{fmt.label.replace(" Report", "").replace(" Export", "")}</span>
                            {exportSuccess === key ? <CheckCircle2 size={12} style={{ color: "var(--success)" }} /> : exporting === key ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button className="button ghost sm" onClick={() => {
                        const url = `${window.location.origin}/projects/${project.id}`;
                        navigator.clipboard.writeText(url).then(() => {
                          setExportSuccess(`share-${project.name}`);
                          if (successTimerRef.current) clearTimeout(successTimerRef.current);
                          successTimerRef.current = setTimeout(() => setExportSuccess(null), 2000);
                        }).catch(() => {
                          window.prompt("Copy this link:", url);
                        });
                      }}><Share2 size={12} /> {exportSuccess === `share-${project.name}` ? "Copied!" : "Share"}</button>
                      <button className="button ghost sm" onClick={() => window.print()}><Printer size={12} /> Print</button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
