"use client";

import { Page } from "@/components/ui/page";
import { XrdChart } from "@/components/charts/xrd-chart";
import { CrystalViewer } from "@/components/crystal-viewer";
import { useJobs, useExecuteJob } from "@/hooks/use-api";
import { Play, SlidersHorizontal, Loader2 } from "lucide-react";

export default function Analysis() {
  const { data: jobsData, isLoading } = useJobs();
  const executeJob = useExecuteJob();
  const jobs = jobsData?.jobs ?? [];
  const activeJob = jobs.find((j) => j.status === "RUNNING") || jobs[0];

  return (
    <Page
      eyebrow={activeJob ? `Analysis · ${activeJob.job_id.slice(0, 8)}` : "Analysis"}
      title={activeJob ? activeJob.job_type : "Analysis workspace"}
      description={
        activeJob
          ? `Status: ${activeJob.status} · ${Math.round(activeJob.progress)}% complete`
          : "Submit an analysis job from an uploaded file."
      }
      actions={
        <>
          <button className="button" onClick={() => window.location.href = "/settings"}>
            <SlidersHorizontal size={15} />
            Parameters
          </button>
          {activeJob && activeJob.status === "QUEUED" && (
            <button
              className="button primary"
              onClick={() => executeJob.mutate(activeJob.job_id)}
              disabled={executeJob.isPending}
            >
              {executeJob.isPending ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Play size={15} />
              )}
              Run analysis
            </button>
          )}
        </>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : !activeJob ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <p className="muted">No active analysis jobs. Upload a file to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid two">
            <section className="card">
              <div className="section">
                <div>
                  <h2>Diffraction pattern</h2>
                  <span className="muted">Experimental, calculated, and difference profiles</span>
                </div>
                <span className={`badge ${activeJob.status === "COMPLETED" ? "good" : ""}`}>
                  {activeJob.status === "RUNNING"
                    ? `${Math.round(activeJob.progress)}% complete`
                    : activeJob.status}
                </span>
              </div>
              <XrdChart />
            </section>

            <section className="card">
              <div className="section">
                <div>
                  <h2>Crystal structure</h2>
                  <span className="muted">Top reference match</span>
                </div>
              </div>
              <CrystalViewer />
            </section>
          </div>

          <div className="grid two" style={{ marginTop: 16 }}>
            <section className="card">
              <h2>Job Details</h2>
              <table className="table" style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Job ID</td>
                    <td>{activeJob.job_id}</td>
                  </tr>
                  <tr>
                    <td>Type</td>
                    <td>{activeJob.job_type}</td>
                  </tr>
                  <tr>
                    <td>Status</td>
                    <td>
                      <span className={`badge ${activeJob.status === "COMPLETED" ? "good" : ""}`}>
                        {activeJob.status}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Progress</td>
                    <td>{Math.round(activeJob.progress)}%</td>
                  </tr>
                  <tr>
                    <td>Created</td>
                    <td className="muted">{activeJob.created_at?.slice(0, 19).replace("T", " ")}</td>
                  </tr>
                  {activeJob.error && (
                    <tr>
                      <td>Error</td>
                      <td style={{ color: "var(--error)" }}>{activeJob.error}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h2>All Jobs</h2>
              {jobs.length === 0 ? (
                <p className="muted" style={{ padding: 20 }}>No jobs found.</p>
              ) : (
                jobs.map((j) => (
                  <div
                    style={{
                      padding: "13px 0",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                    key={j.job_id}
                  >
                    <strong>
                      {j.job_type}{" "}
                      <span className={`badge ${j.status === "COMPLETED" ? "good" : ""}`}>
                        {j.status}
                      </span>
                    </strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {j.job_id.slice(0, 8)} · {Math.round(j.progress)}% complete
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </>
      )}
    </Page>
  );
}
