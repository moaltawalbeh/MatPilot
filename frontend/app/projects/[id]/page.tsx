"use client";

import { Page } from "@/components/ui/page";
import { CrystalViewer } from "@/components/crystal-viewer";
import { XrdChart } from "@/components/charts/xrd-chart";
import { useProject, useDeleteProject } from "@/hooks/use-api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { useCallback } from "react";

const TABS = ["Overview", "Files", "Analysis", "Results", "Reports", "References", "Notes", "History", "Jobs", "Activity"];

export default function ProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { data: project, isLoading } = useProject(id);
  const deleteProject = useDeleteProject();

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this project?")) return;
    await deleteProject.mutateAsync(id);
    router.push("/projects");
  }, [id, deleteProject, router]);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Loader2 size={24} className="spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <Page eyebrow="Project" title="Not found" description="This project does not exist.">
        <Link href="/projects" className="button">
          Back to projects
        </Link>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="Project · XRD"
      title={project.name}
      description={`${project.material || "No material"} · Updated ${project.updated_at.slice(0, 10)}`}
      actions={
        <button className="button" onClick={handleDelete} style={{ color: "#ff6b6b" }}>
          <Trash2 size={15} />
          Delete
        </button>
      }
    >
      <nav className="tabs">
        {TABS.map((x) => (
          <a href={`#${x.toLowerCase()}`} key={x}>
            {x}
          </a>
        ))}
      </nav>

      <div className="grid two" style={{ marginTop: 16 }}>
        <section className="card">
          <div className="section">
            <div>
              <h2>Pattern data</h2>
              <span className="muted">
                {project.files} file{project.files !== 1 ? "s" : ""} uploaded
              </span>
            </div>
            <Link href="/analysis">Full analysis</Link>
          </div>
          <XrdChart />
        </section>

        <section className="card">
          <div className="section">
            <div>
              <h2>Structure preview</h2>
              <span className="muted">Crystal structure viewer</span>
            </div>
          </div>
          <CrystalViewer />
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Project Details</h2>
        <table className="table" style={{ marginTop: 16 }}>
          <tbody>
            <tr>
              <td>ID</td>
              <td className="muted">{project.id}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>
                <span className={`badge ${project.status === "Complete" ? "good" : ""}`}>
                  {project.status}
                </span>
              </td>
            </tr>
            <tr>
              <td>Material</td>
              <td>{project.material || "-"}</td>
            </tr>
            <tr>
              <td>Description</td>
              <td>{project.description || "-"}</td>
            </tr>
            <tr>
              <td>Files</td>
              <td>{project.files}</td>
            </tr>
            <tr>
              <td>Analyses</td>
              <td>{project.analyses}</td>
            </tr>
            <tr>
              <td>Created</td>
              <td className="muted">{project.created_at.slice(0, 19).replace("T", " ")}</td>
            </tr>
            <tr>
              <td>Tags</td>
              <td>{project.tags.length > 0 ? project.tags.join(", ") : "-"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </Page>
  );
}
