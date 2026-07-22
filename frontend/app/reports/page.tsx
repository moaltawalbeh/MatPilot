"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useDownloadPDFReport } from "@/hooks/use-api";
import { apiService } from "@/lib/api-client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Download, Printer, Share2, FileCode, FileJson, FileSpreadsheet, CheckCircle2, Loader2, ChevronDown, ChevronRight, FlaskConical, Clock } from "lucide-react";

type ExportFormat = "pdf" | "word" | "text";

const exportFormats: { key: ExportFormat; label: string; description: string; icon: typeof FileText }[] = [
  { key: "pdf", label: "PDF Report", description: "Formatted scientific report with figures, tables, and methodology", icon: FileText },
  { key: "word", label: "Word Document", description: "Editable Microsoft Word document for collaboration and annotation", icon: FileCode },
  { key: "text", label: "Plain Text", description: "Lightweight text report for quick sharing and archival", icon: FileSpreadsheet },
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

function buildReportSections(projectName: string, project: any, exp: any) {
  const lines: string[] = [];
  const now = new Date();

  lines.push("MATPILOT SCIENTIFIC REPORT");
  lines.push("=".repeat(60));
  lines.push("");

  lines.push("PROJECT INFORMATION");
  lines.push("-".repeat(40));
  lines.push(`  Project Name:      ${projectName}`);
  lines.push(`  Material:          ${project?.material || "N/A"}`);
  lines.push(`  Status:            ${project?.status || "N/A"}`);
  lines.push(`  Experiments:       ${project?.experiments ?? "N/A"}`);
  lines.push(`  Created:           ${project?.created_at ? new Date(project.created_at).toLocaleString() : "N/A"}`);
  lines.push(`  Last Updated:      ${project?.updated_at ? new Date(project.updated_at).toLocaleString() : "N/A"}`);
  lines.push("");

  if (exp) {
    lines.push("EXPERIMENT INFORMATION");
    lines.push("-".repeat(40));
    lines.push(`  Experiment Name:   ${exp.name || "N/A"}`);
    lines.push(`  Status:            ${exp.status || "N/A"}`);
    lines.push(`  Data Points:       ${exp.data_points?.toLocaleString() ?? "N/A"}`);
    if (exp.two_theta_range) {
      lines.push(`  2\u03b8 Range:         ${exp.two_theta_range[0].toFixed(1)}\u00b0 \u2013 ${exp.two_theta_range[1].toFixed(1)}\u00b0`);
    }
    if (exp.wavelength_angstrom) {
      lines.push(`  Wavelength:        ${exp.wavelength_angstrom} \u00c5`);
    }
    lines.push(`  Uploaded File:     ${exp.primary_file_id || "N/A"}`);
    lines.push("");
  }

  lines.push(`  Analysis Date:     ${now.toLocaleString()}`);
  lines.push(`  Report Generator:  MatPilot v1.0`);
  lines.push("");

  const peaks = (exp?.detected_peaks || []) as { two_theta: number; intensity: number; d_spacing?: number; fwhm?: number }[];
  if (peaks.length > 0) {
    lines.push("DETECTED PEAKS");
    lines.push("-".repeat(40));
    lines.push(`  Total Peaks: ${peaks.length}`);
    lines.push("");
    lines.push(`  ${"2\u03b8 (\u00b0)".padEnd(14)} ${"Intensity".padEnd(14)} ${"d (\u00c5)".padEnd(14)} ${"FWHM (\u00b0)".padEnd(14)}`);
    lines.push(`  ${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(14)} ${"-".repeat(14)}`);
    peaks.slice(0, 50).forEach((p) => {
      lines.push(`  ${p.two_theta.toFixed(3).padEnd(14)} ${p.intensity.toFixed(1).padEnd(14)} ${(p.d_spacing?.toFixed(4) ?? "\u2014").padEnd(14)} ${(p.fwhm?.toFixed(3) ?? "\u2014").padEnd(14)}`);
    });
    if (peaks.length > 50) lines.push(`  ... and ${peaks.length - 50} more peaks`);
    lines.push("");
  }

  const phases = (exp?.candidate_phases || []) as { material_name: string; material_formula: string; match_score: number; confidence: string; matched_peaks: number; source_provider?: string; space_group?: string }[];
  if (phases.length > 0) {
    lines.push("PHASE IDENTIFICATION RESULTS");
    lines.push("-".repeat(40));
    lines.push(`  Candidates Found: ${phases.length}`);
    lines.push("");
    phases.forEach((p, i) => {
      lines.push(`  ${i + 1}. ${p.material_name || "Unknown"}`);
      lines.push(`     Formula:       ${p.material_formula || "N/A"}`);
      lines.push(`     Match Score:   ${((p.match_score ?? 0) * 100).toFixed(1)}%`);
      lines.push(`     Confidence:    ${p.confidence || "N/A"}`);
      lines.push(`     Matched Peaks: ${p.matched_peaks ?? 0}`);
      if (p.source_provider) lines.push(`     Source:        ${p.source_provider}`);
      lines.push("");
    });

    lines.push("  SELECTED PHASES");
    lines.push(`  (All ${phases.length} candidate phases are available for refinement)`);
    lines.push("");
  }

  const rv = exp?.rietveld_results as Record<string, any> | undefined;
  if (rv && rv.status === "completed") {
    lines.push("REFINEMENT MODE");
    lines.push("-".repeat(40));
    lines.push(`  Mode: ${rv.workflow === "auto" ? "Automatic Rietveld Refinement" : "Manual Rietveld Refinement"}`);
    lines.push("");

    lines.push("REFINEMENT STATISTICS");
    lines.push("-".repeat(40));
    const stats = [
      ["R_wp", rv.r_wp, "%"],
      ["R_p", rv.r_p, "%"],
      ["R_exp", rv.r_exp, "%"],
      ["\u03c7\u00b2", rv.chi_squared, ""],
      ["GoF", rv.gof, ""],
      ["Iterations", rv.iterations, ""],
    ];
    stats.forEach(([label, val, unit]) => {
      lines.push(`  ${String(label).padEnd(14)} ${val != null ? (typeof val === "number" ? val.toFixed(4) : String(val)) : "\u2014"} ${unit}`);
    });
    lines.push("");

    const params = rv.parameters as Record<string, any> | undefined;
    if (params) {
      lines.push("REFINED LATTICE PARAMETERS");
      lines.push("-".repeat(40));
      if (params.scale != null) lines.push(`  Scale:            ${params.scale.toFixed(6)}`);
      if (params.zero_shift != null) lines.push(`  Zero Shift:       ${params.zero_shift.toFixed(6)} \u00b0`);
      if (params.U != null) lines.push(`  U (Caglioti):     ${params.U.toFixed(6)}`);
      if (params.V != null) lines.push(`  V (Caglioti):     ${params.V.toFixed(6)}`);
      if (params.W != null) lines.push(`  W (Caglioti):     ${params.W.toFixed(6)}`);
      if (params.phase_fractions?.length > 0) {
        params.phase_fractions.forEach((f: number, i: number) => {
          lines.push(`  Phase ${i + 1} Fraction: ${(f * 100).toFixed(2)}%`);
        });
      }
      lines.push("");
    }

    if (rv.phases_used?.length > 0) {
      lines.push("CRYSTAL STRUCTURE INFORMATION");
      lines.push("-".repeat(40));
      rv.phases_used.forEach((phase: any, i: number) => {
        lines.push(`  Phase ${i + 1}: ${phase.name || phase.formula || "Unknown"}`);
        if (phase.formula) lines.push(`    Formula:      ${phase.formula}`);
        if (phase.space_group) lines.push(`    Space Group:  ${phase.space_group}`);
        lines.push(`    Fraction:     ${((phase.fraction ?? 0) * 100).toFixed(1)}%`);
        lines.push(`    Peaks:        ${phase.n_peaks ?? 0}`);
        if (phase.lattice_params) {
          lines.push(`    Lattice:`);
          Object.entries(phase.lattice_params).forEach(([k, v]) => {
            lines.push(`      ${k}: ${typeof v === "number" ? v.toFixed(4) : String(v)}${["a", "b", "c"].includes(k) ? " \u00c5" : ""}`);
          });
        }
        lines.push("");
      });
    }
  }

  const aiInterpretation = exp?.metadata?.ai_interpretation;
  if (aiInterpretation) {
    lines.push("AI INTERPRETATION");
    lines.push("-".repeat(40));
    lines.push(`  ${aiInterpretation}`);
    lines.push("");
  }

  lines.push("SUMMARY");
  lines.push("-".repeat(40));
  if (exp) {
    lines.push(`  Experiment:    ${exp.name || "N/A"}`);
    lines.push(`  Data Points:   ${exp.data_points?.toLocaleString() ?? "N/A"}`);
    if (peaks.length > 0) lines.push(`  Peaks Found:   ${peaks.length}`);
    if (phases.length > 0) lines.push(`  Phases Found:  ${phases.length}`);
    if (rv?.status === "completed") {
      lines.push(`  Refinement:    Completed (${rv.workflow})`);
      if (rv.gof != null) lines.push(`  GoF:           ${rv.gof.toFixed(3)}`);
      if (rv.r_wp != null) lines.push(`  R_wp:          ${rv.r_wp.toFixed(2)}%`);
    }
  }
  lines.push("");
  lines.push("=".repeat(60));
  lines.push("Generated by MatPilot — Materials Characterization Platform");
  lines.push("https://www.matpilot.site");

  return lines;
}

function buildWordHtml(projectName: string, project: any, exp: any): string {
  const now = new Date();
  const peaks = (exp?.detected_peaks || []) as { two_theta: number; intensity: number; d_spacing?: number; fwhm?: number }[];
  const phases = (exp?.candidate_phases || []) as { material_name: string; material_formula: string; match_score: number; confidence: string; matched_peaks: number }[];
  const rv = exp?.rietveld_results as Record<string, any> | undefined;

  const parts: string[] = [
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`,
    `<head><meta charset="utf-8"><title>${projectName} — MatPilot Report</title>`,
    `<style>`,
    `body{font-family:Calibri,Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e;line-height:1.6;font-size:11pt}`,
    `h1{color:#f97316;border-bottom:2px solid #f97316;padding-bottom:8px;font-size:20pt}`,
    `h2{color:#334155;margin-top:28px;font-size:14pt;border-bottom:1px solid #e2e8f0;padding-bottom:4px}`,
    `h3{color:#475569;margin-top:16px;font-size:12pt}`,
    `table{width:100%;border-collapse:collapse;margin:12px 0}`,
    `th,td{padding:6px 10px;border:1px solid #e2e8f0;text-align:left;font-size:10pt}`,
    `th{background:#f8fafc;font-weight:600}`,
    `.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9pt;font-weight:600}`,
    `.good{background:#d1fae5;color:#065f46}.info{background:#dbeafe;color:#1e40af}`,
    `.stat-value{font-size:14pt;font-weight:700;color:#f97316}`,
    `.stat-label{font-size:9pt;color:#64748b;text-transform:uppercase}`,
    `.footer{margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:9pt}`,
    `</style></head><body>`,
    `<h1>${projectName}</h1>`,
    `<p style="color:#64748b"><strong>Material:</strong> ${project?.material || "N/A"} &nbsp;|&nbsp; <strong>Generated:</strong> ${now.toLocaleString()} &nbsp;|&nbsp; <strong>Platform:</strong> MatPilot v1.0</p>`,
  ];

  parts.push(`<h2>Project Information</h2><table>`);
  parts.push(`<tr><td><strong>Project Name</strong></td><td>${projectName}</td></tr>`);
  parts.push(`<tr><td><strong>Material</strong></td><td>${project?.material || "N/A"}</td></tr>`);
  parts.push(`<tr><td><strong>Status</strong></td><td>${project?.status || "N/A"}</td></tr>`);
  parts.push(`<tr><td><strong>Experiments</strong></td><td>${project?.experiments ?? "N/A"}</td></tr>`);
  parts.push(`<tr><td><strong>Last Updated</strong></td><td>${project?.updated_at ? new Date(project.updated_at).toLocaleString() : "N/A"}</td></tr>`);
  parts.push(`</table>`);

  if (exp) {
    parts.push(`<h2>Experiment Information</h2><table>`);
    parts.push(`<tr><td><strong>Experiment</strong></td><td>${exp.name || "N/A"}</td></tr>`);
    parts.push(`<tr><td><strong>Status</strong></td><td>${exp.status || "N/A"}</td></tr>`);
    parts.push(`<tr><td><strong>Data Points</strong></td><td>${exp.data_points?.toLocaleString() ?? "N/A"}</td></tr>`);
    if (exp.two_theta_range) parts.push(`<tr><td><strong>2\u03b8 Range</strong></td><td>${exp.two_theta_range[0].toFixed(1)}\u00b0 \u2013 ${exp.two_theta_range[1].toFixed(1)}\u00b0</td></tr>`);
    parts.push(`<tr><td><strong>Analysis Date</strong></td><td>${now.toLocaleString()}</td></tr>`);
    parts.push(`</table>`);
  }

  if (peaks.length > 0) {
    parts.push(`<h2>Detected Peaks (${peaks.length})</h2><table><thead><tr><th>#</th><th>2\u03b8 (\u00b0)</th><th>Intensity</th><th>d (\u00c5)</th><th>FWHM (\u00b0)</th></tr></thead><tbody>`);
    peaks.slice(0, 50).forEach((p, i) => {
      parts.push(`<tr><td>${i + 1}</td><td>${p.two_theta.toFixed(3)}</td><td>${p.intensity.toFixed(1)}</td><td>${p.d_spacing?.toFixed(4) || "\u2014"}</td><td>${p.fwhm?.toFixed(3) || "\u2014"}</td></tr>`);
    });
    if (peaks.length > 50) parts.push(`<tr><td colspan="5" style="text-align:center;color:#888">\u2026and ${peaks.length - 50} more peaks</td></tr>`);
    parts.push(`</tbody></table>`);
  }

  if (phases.length > 0) {
    parts.push(`<h2>Phase Identification Results (${phases.length} candidates)</h2><table><thead><tr><th>#</th><th>Material</th><th>Formula</th><th>Match</th><th>Confidence</th><th>Peaks</th></tr></thead><tbody>`);
    phases.forEach((p, i) => {
      const confClass = p.confidence === "High" ? "good" : "info";
      parts.push(`<tr><td>${i + 1}</td><td><strong>${p.material_name}</strong></td><td>${p.material_formula}</td><td>${((p.match_score ?? 0) * 100).toFixed(1)}%</td><td><span class="badge ${confClass}">${p.confidence}</span></td><td>${p.matched_peaks}</td></tr>`);
    });
    parts.push(`</tbody></table>`);
  }

  if (rv && rv.status === "completed") {
    parts.push(`<h2>Refinement Results</h2>`);
    parts.push(`<p><strong>Mode:</strong> ${rv.workflow === "auto" ? "Automatic Rietveld" : "Manual Rietveld"}</p>`);
    parts.push(`<h3>Refinement Statistics</h3><table>`);
    const stats: [string, any, string][] = [
      ["R<sub>wp</sub>", rv.r_wp, "%"],
      ["R<sub>p</sub>", rv.r_p, "%"],
      ["R<sub>exp</sub>", rv.r_exp, "%"],
      ["\u03c7\u00b2", rv.chi_squared, ""],
      ["GoF", rv.gof, ""],
      ["Iterations", rv.iterations, ""],
    ];
    stats.forEach(([label, val, unit]) => {
      parts.push(`<tr><td>${label}</td><td class="stat-value">${val != null ? (typeof val === "number" ? val.toFixed(4) : String(val)) : "\u2014"} ${unit}</td></tr>`);
    });
    parts.push(`</table>`);

    if (rv.parameters) {
      parts.push(`<h3>Refined Parameters</h3><table>`);
      if (rv.parameters.scale != null) parts.push(`<tr><td>Scale</td><td>${rv.parameters.scale.toFixed(6)}</td></tr>`);
      if (rv.parameters.zero_shift != null) parts.push(`<tr><td>Zero Shift</td><td>${rv.parameters.zero_shift.toFixed(6)} \u00b0</td></tr>`);
      if (rv.parameters.U != null) parts.push(`<tr><td>U (Caglioti)</td><td>${rv.parameters.U.toFixed(6)}</td></tr>`);
      if (rv.parameters.V != null) parts.push(`<tr><td>V (Caglioti)</td><td>${rv.parameters.V.toFixed(6)}</td></tr>`);
      if (rv.parameters.W != null) parts.push(`<tr><td>W (Caglioti)</td><td>${rv.parameters.W.toFixed(6)}</td></tr>`);
      parts.push(`</table>`);
    }

    if (rv.phases_used?.length > 0) {
      parts.push(`<h3>Crystal Structure Information</h3>`);
      rv.phases_used.forEach((phase: any, i: number) => {
        parts.push(`<h4>Phase ${i + 1}: ${phase.name || phase.formula || "Unknown"}</h4><table>`);
        if (phase.formula) parts.push(`<tr><td>Formula</td><td>${phase.formula}</td></tr>`);
        if (phase.space_group) parts.push(`<tr><td>Space Group</td><td>${phase.space_group}</td></tr>`);
        parts.push(`<tr><td>Fraction</td><td>${((phase.fraction ?? 0) * 100).toFixed(1)}%</td></tr>`);
        parts.push(`<tr><td>Peaks</td><td>${phase.n_peaks ?? 0}</td></tr>`);
        if (phase.lattice_params) {
          Object.entries(phase.lattice_params).forEach(([k, v]) => {
            parts.push(`<tr><td>${k}</td><td>${typeof v === "number" ? v.toFixed(4) : String(v)}${["a", "b", "c"].includes(k) ? " \u00c5" : ""}</td></tr>`);
          });
        }
        parts.push(`</table>`);
      });
    }
  }

  parts.push(`<div class="footer"><p>Generated by <strong>MatPilot</strong> \u2014 Materials Characterization Platform | <a href="https://www.matpilot.site">matpilot.site</a></p></div>`);
  parts.push(`</body></html>`);
  return parts.join("\n");
}

export default function ReportsPage() {
  const { data: projects, isLoading } = useProjects();
  const allProjects = projects ?? [];
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);
  const [projectExps, setProjectExps] = useState<Record<string, any[]>>({});
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  const downloadPdf = useDownloadPDFReport();

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (expandedProject && !projectExps[expandedProject]) {
      apiService.listProjectExperiments(expandedProject).then((exps) => {
        setProjectExps((prev) => ({ ...prev, [expandedProject]: exps as any[] }));
      }).catch(() => {});
    }
  }, [expandedProject, projectExps]);

  const getExpForExport = (projectId: string, experimentId?: string | null) => {
    const exps = projectExps[projectId] || [];
    if (experimentId) return exps.find((e) => e.id === experimentId) || exps[0] || null;
    return exps[0] || null;
  };

  const handleExport = async (format: ExportFormat, projectName: string, projectId?: string) => {
    const key = `${format}-${projectName}`;
    setExporting(key);
    setExportSuccess(null);
    try {
      const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const firstExp = getExpForExport(projectId || "", selectedExperimentId);
      const project = allProjects.find((p) => p.id === projectId || p.name === projectName);

      if (format === "pdf") {
        if (projectId && firstExp) {
          try {
            const blob = await apiService.downloadReport(firstExp.id);
            downloadBlob(blob, `${safeName}_report.pdf`);
          } catch {
            const lines = buildReportSections(projectName, project, firstExp);
            downloadReport(lines.join("\n"), `${safeName}_report.txt`, "text/plain");
          }
        } else {
          const lines = buildReportSections(projectName, project, null);
          downloadReport(lines.join("\n"), `${safeName}_report.txt`, "text/plain");
        }
      } else if (format === "word") {
        const html = buildWordHtml(projectName, project, firstExp || null);
        downloadReport(html, `${safeName}_report.doc`, "application/msword");
      } else if (format === "text") {
        const lines = buildReportSections(projectName, project, firstExp || null);
        downloadReport(lines.join("\n"), `${safeName}_report.txt`, "text/plain");
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, padding: "0 20px 20px" }}>
          {exportFormats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <div key={fmt.key} style={{ padding: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} style={{ color: "var(--accent-orange)" }} />
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
                    {(projectExps[project.id] || []).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Experiments</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {(projectExps[project.id] || []).map((exp: any) => {
                            const hasResults = exp.rietveld_results?.status === "completed";
                            const isSelected = selectedExperimentId === exp.id;
                            return (
                              <button key={exp.id} onClick={() => setSelectedExperimentId(isSelected ? null : exp.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: "var(--radius-sm)", background: isSelected ? "var(--accent-orange-bg)" : "var(--surface-2)", border: `1px solid ${isSelected ? "var(--accent-orange)" : "var(--border-subtle)"}`, cursor: "pointer", textAlign: "left", fontSize: 11, width: "100%" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasResults ? "var(--success)" : "var(--text-muted)", flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, flex: 1 }}>{exp.name || "Untitled"}</span>
                                {hasResults && <span className="badge good" style={{ fontSize: 9 }}>Refined</span>}
                                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{exp.data_points?.toLocaleString() || 0} pts</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                      {exportFormats.map((fmt) => {
                        const Icon = fmt.icon;
                        const key = `${fmt.key}-${project.name}`;
                        const hasExp = (projectExps[project.id] || []).length > 0;
                        return (
                          <button key={fmt.key} className="button" disabled={exporting === key || !hasExp} onClick={() => handleExport(fmt.key, project.name, project.id)} style={{ justifyContent: "space-between", padding: "8px 12px", fontSize: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon size={12} />{fmt.label.replace(" Report", "").replace(" Document", "")}</span>
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
