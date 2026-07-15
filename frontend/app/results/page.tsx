"use client";

import { Page } from "@/components/ui/page";
import { useJobs } from "@/hooks/use-api";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function Results() {
  const { data: jobsData, isLoading } = useJobs();
  const completedJobs = (jobsData?.jobs ?? []).filter((j) => j.status === "COMPLETED");

  return (
    <Page
      eyebrow="Knowledge record"
      title="Results"
      description="Validated observations and outputs from completed analyses."
    >
      <section className="card">
        <div className="section">
          <div>
            <h2>Completed analyses</h2>
            <span className="muted">Results from finished analysis jobs</span>
          </div>
          <Link href="/reports" className="button">
            Generate report
          </Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 30 }}>
            <Loader2 size={20} className="spin" />
          </div>
        ) : completedJobs.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>
            No completed analyses yet. Run an analysis to see results here.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Type</th>
                <th>Result</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {completedJobs.map((j) => (
                <tr key={j.job_id}>
                  <td>
                    <strong>{j.job_id.slice(0, 8)}</strong>
                  </td>
                  <td>{j.job_type}</td>
                  <td>
                    <span className="badge good">Complete</span>
                  </td>
                  <td className="muted">
                    {j.finished_at?.slice(0, 19).replace("T", " ") ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </Page>
  );
}
