"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useJobs, useSystemHealth } from "@/hooks/use-api";
import { Plus, FolderKanban, FlaskConical, BarChart3, TrendingUp, Clock, ArrowUpRight, Zap, Activity } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: jobsData, isLoading: loadingJobs } = useJobs();
  const { data: health, isLoading: loadingHealth } = useSystemHealth();

  const allProjects = projects ?? [];
  const jobs = jobsData?.jobs ?? [];
  const activeCount = allProjects.filter((p) => p.status === "Active").length;
  const runningJobs = jobs.filter((j) => j.status === "RUNNING").length;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;

  const metrics = [
    { label: t.dash_projects, value: loadingHealth ? "—" : String(activeCount), sub: `${allProjects.length} total`, icon: FolderKanban, color: "var(--accent-orange)" },
    { label: "Version", value: health?.version ?? "—", sub: health?.environment ?? "dev", icon: TrendingUp, color: "var(--accent-emerald)" },
    { label: t.dash_analyses, value: loadingJobs ? "—" : String(runningJobs), sub: `${completedJobs} completed`, icon: BarChart3, color: "var(--accent-cyan)" },
    { label: "Pipeline", value: health?.components?.pipeline ? "Ready" : "Standby", sub: health?.components?.storage ? "Storage OK" : "—", icon: FlaskConical, color: "var(--accent-violet)" },
  ];

  return (
    <Page
      eyebrow="Workspace"
      title={t.dash_title}
      description={t.dash_subtitle}
      actions={
        <Link href="/projects" className="button primary" style={{ textDecoration: "none" }}>
          <Plus size={15} /> New project
        </Link>
      }
    >
      {/* Metrics */}
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {metrics.map((m) => (
          <div className="card" key={m.label} style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "start" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <m.icon size={17} style={{ color: m.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{m.label}</div>
              <div className="number">{m.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow + Activity */}
      <div className="grid two" style={{ marginBottom: 20 }}>
        {/* Scientific Workflow */}
        <section className="card">
          <div className="section">
            <div>
              <h2>{t.dash_quick_start}</h2>
              <span className="muted">Standard XRD analysis pipeline</span>
            </div>
          </div>
          <div style={{ padding: "4px 20px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { step: "1", name: "Create Project", desc: "Organize your research", href: "/projects", color: "var(--accent-orange)" },
                { step: "2", name: "Upload XRD Data", desc: "Import diffraction patterns", href: "/projects", color: "var(--accent-cyan)" },
                { step: "3", name: "Run Pipeline", desc: "Automatic preprocessing & analysis", href: "/projects", color: "var(--accent-emerald)" },
                { step: "4", name: "View Results", desc: "Phase ID & refinement stats", href: "/projects", color: "var(--accent-violet)" },
              ].map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: item.color, flexShrink: 0 }}>
                    {item.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 550 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{item.desc}</div>
                  </div>
                  <ArrowUpRight size={14} color="var(--text-muted)" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="card">
          <div className="section">
            <div>
              <h2>{t.dash_recent}</h2>
              <span className="muted">Latest analyses and uploads</span>
            </div>
          </div>
          {loadingJobs ? (
            <div style={{ padding: 30, textAlign: "center" }}><Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} /></div>
          ) : jobs.length > 0 ? (
            <div style={{ padding: "0 20px 12px" }}>
              {jobs.slice(0, 5).map((j) => (
                <div key={j.job_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: j.status === "COMPLETED" ? "var(--success)" : j.status === "RUNNING" ? "var(--accent-orange)" : "var(--text-muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.job_type}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <Clock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                      {j.created_at.slice(0, 16).replace("T", " ")}
                      {j.status === "RUNNING" ? ` · ${Math.round(j.progress)}%` : ""}
                    </div>
                  </div>
                  <span className={`badge ${j.status === "COMPLETED" ? "good" : j.status === "RUNNING" ? "info" : ""}`} style={{ fontSize: 10 }}>
                    {j.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ padding: "20px", textAlign: "center", fontSize: 13 }}>
              No activity yet. Create a project and upload data to get started.
            </p>
          )}
        </section>
      </div>

      {/* Recent Projects Table */}
      <section className="card">
        <div className="section">
          <div>
            <h2>{t.dash_recent} {t.dash_projects}</h2>
            <span className="muted">Your active characterization work</span>
          </div>
          <Link href="/projects" className="button ghost sm" style={{ textDecoration: "none" }}>View all</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Material</th>
              <th>Files</th>
              <th>Experiments</th>
              <th>Updated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingProjects ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24 }}><Activity size={18} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : allProjects.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-tertiary)" }}>
                  No projects yet.{" "}
                  <Link href="/projects" style={{ color: "var(--accent-orange)" }}>Create your first project</Link>{" "}to get started.
                </td>
              </tr>
            ) : (
              allProjects.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/projects/${p.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}><strong>{p.name}</strong></Link></td>
                  <td>{p.material || "—"}</td>
                  <td>{p.files}</td>
                  <td>{p.experiments}</td>
                  <td style={{ color: "var(--text-tertiary)" }}>{p.updated_at.slice(0, 10)}</td>
                  <td><span className={`badge ${p.status === "Complete" ? "good" : p.status === "Active" ? "info" : ""}`}>{p.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
