"use client";

import { Page } from "@/components/ui/page";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useProjects, useJobs, useSystemHealth } from "@/hooks/use-api";
import { ArrowUpRight, Plus, Upload, Loader2 } from "lucide-react";
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
        <>
          <Link href="/upload" className="button">
            <Upload size={15} />
            Upload
          </Link>
          <Link href="/projects" className="button primary">
            <Plus size={15} />
            New project
          </Link>
        </>
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
              <h2>Latest diffraction pattern</h2>
              <span className="muted">
                {allProjects.length > 0 ? allProjects[0].name : "No projects yet"}
              </span>
            </div>
            <Link href="/analysis">
              Open analysis <ArrowUpRight size={13} />
            </Link>
          </div>
          <XrdChart />
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
              No jobs yet. Upload a file to get started.
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
                  <Link href="/upload" style={{ color: "var(--blue)" }}>
                    Upload your first file
                  </Link>{" "}
                  to create one.
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
