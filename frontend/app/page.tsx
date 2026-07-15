"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useJobs, useSystemHealth } from "@/hooks/use-api";
import { Plus, Loader2, FolderKanban } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: jobsData, isLoading: loadingJobs } = useJobs();
  const { data: health, isLoading: loadingHealth } = useSystemHealth();

  const allProjects = projects ?? [];
  const jobs = jobsData?.jobs ?? [];

  const activeCount = allProjects.filter((p) => p.status === "Active").length;
  const totalCount = allProjects.length;
  const runningJobs = jobs.filter((j) => j.status === "RUNNING").length;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED").length;

  return (
    <Page
      eyebrow="Characterization workspace"
      title="Good morning, Maya"
      description="A clear view of your materials work, analyses, and new observations."
      actions={
        <Link href="/projects" className="button primary">
          <Plus size={15} />
          New project
        </Link>
      }
    >
      <div className="grid metrics">
        {[
          ["Active projects", loadingHealth ? "..." : String(activeCount), `${totalCount} total`],
          ["System version", health?.version ?? "...", health?.environment ?? ""],
          ["Running jobs", loadingJobs ? "..." : String(runningJobs), `${completedJobs} complete`],
          ["Pipeline", health?.components?.pipeline ? "Ready" : "Standby", health?.components?.storage ? "Storage OK" : ""],
        ].map(([l, n, s]) => (
          <div className="card" key={l}>
            <span className="muted">{l}</span>
            <div className="number">{n}</div>
            <span className="muted good">{s}</span>
          </div>
        ))}
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="section">
            <div>
              <h2>Quick start</h2>
              <span className="muted">Create a project to begin analyzing diffraction data</span>
            </div>
          </div>
          <div style={{ padding: 20, textAlign: "center" }}>
            <Link href="/projects" className="button primary" style={{ marginBottom: 12 }}>
              <FolderKanban size={15} />
              Go to Projects
            </Link>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              All uploads, analyses, and results live inside Projects.
              Create a project to upload files and run analyses.
            </p>
          </div>
        </section>

        <section className="card">
          <div className="section">
            <div>
              <h2>Analysis activity</h2>
              <span className="muted">Recent jobs</span>
            </div>
          </div>
          {loadingJobs ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <Loader2 size={20} className="spin" />
            </div>
          ) : jobs.length > 0 ? (
            jobs.slice(0, 5).map((j) => (
              <div
                style={{
                  borderTop: "1px solid #263545",
                  padding: "14px 0",
                }}
                key={j.job_id}
              >
                <strong>
                  {j.job_type}{" "}
                  <span
                    className={`badge ${j.status === "COMPLETED" ? "good" : ""}`}
                  >
                    {j.status}
                  </span>
                </strong>
                <div className="muted" style={{ marginTop: 4 }}>
                  {j.created_at.slice(0, 16).replace("T", " ")}{" "}
                  {j.status === "RUNNING" ? `${Math.round(j.progress)}% complete` : ""}
                </div>
              </div>
            ))
          ) : (
            <p className="muted" style={{ padding: 20 }}>
              No jobs yet. Create a project and upload a file to get started.
            </p>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section">
          <div>
            <h2>Recent projects</h2>
            <span className="muted">Your active characterization work</span>
          </div>
          <Link href="/projects">View all</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Material</th>
              <th>Files</th>
              <th>Analyses</th>
              <th>Updated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loadingProjects ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                  <Loader2 size={20} className="spin" />
                </td>
              </tr>
            ) : allProjects.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 20 }}>
                  No projects yet.{" "}
                  <Link href="/projects" style={{ color: "var(--blue)" }}>
                    Create your first project
                  </Link>{" "}
                  to get started.
                </td>
              </tr>
            ) : (
              allProjects.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/projects/${p.id}`} style={{ color: "var(--text)", textDecoration: "none" }}>
                      <strong>{p.name}</strong>
                    </Link>
                  </td>
                  <td>{p.material || "-"}</td>
                  <td>{p.files}</td>
                  <td>{p.analyses}</td>
                  <td className="muted">{p.updated_at.slice(0, 10)}</td>
                  <td>
                    <span className={`badge ${p.status === "Complete" ? "good" : ""}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
