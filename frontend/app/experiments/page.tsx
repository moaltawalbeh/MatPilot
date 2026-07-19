"use client";

import { Page } from "@/components/ui/page";
import { useProjects } from "@/hooks/use-api";
import { FlaskConical, Loader2, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";

export default function ExperimentsPage() {
  const { data: projects, isLoading } = useProjects();
  const allProjects = projects ?? [];

  return (
    <Page
      eyebrow="Scientific workspace"
      title="Experiments"
      description="Manage diffraction experiments and access the scientific processing pipeline."
      actions={
        <Link href="/projects" className="button primary" style={{ textDecoration: "none" }}>
          <FlaskConical size={15} /> Go to Projects
        </Link>
      }
    >
      <section className="card">
        <div className="section">
          <div>
            <h2>Active Experiments</h2>
            <span className="muted">Experiments with uploaded diffraction data</span>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} /></div>
        ) : allProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <FlaskConical size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No experiments yet</h3>
            <p className="muted" style={{ fontSize: 13, maxWidth: 380, margin: "0 auto 16px" }}>
              Create a project and upload diffraction data to begin your first experiment.
            </p>
            <Link href="/projects" className="button primary" style={{ textDecoration: "none" }}>Create Project</Link>
          </div>
        ) : (
          <div style={{ padding: "4px 20px 16px" }}>
            <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
              Select a project to view and manage its experiments.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {allProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.12s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--border-strong)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-subtle)"}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FlaskConical size={15} style={{ color: "var(--accent-orange)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {project.material || "No material"} · {project.files} files · {project.experiments} experiments
                    </div>
                  </div>
                  <span className={`badge ${project.status === "Active" ? "info" : project.status === "Complete" ? "good" : ""}`}>{project.status}</span>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Workflow Overview */}
      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="section">
            <div>
              <h2>Scientific Workflow</h2>
              <span className="muted">Standard XRD analysis pipeline</span>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            {[
              { step: "Upload Data", desc: "Import XRD pattern files" },
              { step: "Background Correction", desc: "Subtract diffraction background" },
              { step: "Kα2 Stripping", desc: "Remove Kα2 contribution" },
              { step: "Peak Detection", desc: "Identify diffraction peaks" },
              { step: "Phase Identification", desc: "Search COD for matching phases" },
              { step: "Rietveld Refinement", desc: "Least-squares structural refinement" },
            ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: idx < 5 ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{ width: 24, height: 24, borderRadius: "var(--radius-xs)", background: "var(--accent-orange-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent-orange)", flexShrink: 0 }}>{idx + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 550 }}>{item.step}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section">
            <div>
              <h2>Recent Activity</h2>
              <span className="muted">Latest experiment actions</span>
            </div>
          </div>
          <div style={{ padding: 30, textAlign: "center" }}>
            <Clock size={28} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.4 }} />
            <p className="muted" style={{ fontSize: 13 }}>No recent activity. Start an experiment to see history here.</p>
          </div>
        </section>
      </div>
    </Page>
  );
}
