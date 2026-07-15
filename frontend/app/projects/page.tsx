"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useCreateProject } from "@/hooks/use-api";
import Link from "next/link";
import { Plus, Loader2, Upload } from "lucide-react";
import { useState, useCallback } from "react";

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");

  const all = projects ?? [];

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    const result = await createProject.mutateAsync({ name: name.trim(), material: material.trim() });
    setName("");
    setMaterial("");
    setShowForm(false);
  }, [name, material, createProject]);

  return (
    <Page
      eyebrow="Workspace"
      title="Projects"
      description="Organize raw data, analyses, notes, and reports in one scientific record."
      actions={
        <button className="button primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} />
          New project
        </button>
      }
    >
      {showForm && (
        <section className="card" style={{ marginBottom: 16, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Create project</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              style={{
                flex: 1,
                minWidth: 200,
                padding: "8px 12px",
                background: "#0d1520",
                border: "1px solid #263545",
                borderRadius: 6,
                color: "var(--text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Material formula (optional)"
              style={{
                flex: 1,
                minWidth: 200,
                padding: "8px 12px",
                background: "#0d1520",
                border: "1px solid #263545",
                borderRadius: 6,
                color: "var(--text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button className="button primary" onClick={handleCreate} disabled={!name.trim()}>
              Create
            </button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : all.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p className="muted">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid three">
          {all.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <span className="badge">XRD</span>
              <h2 style={{ marginTop: 23 }}>{p.name}</h2>
              <p className="muted">{p.material || "No material specified"}</p>
              <div
                style={{
                  borderTop: "1px solid #263545",
                  paddingTop: 13,
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className="muted">
                  {p.files} files · {p.analyses} analyses
                </span>
                <span className={`badge ${p.status === "Complete" ? "good" : ""}`}>
                  {p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
