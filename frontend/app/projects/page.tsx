"use client";

import { Page } from "@/components/ui/page";
import { useProjects, useCreateProject } from "@/hooks/use-api";
import Link from "next/link";
import { Plus, Loader2, ArrowUpRight } from "lucide-react";
import { useState, useCallback } from "react";

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState("");
  const [error, setError] = useState("");

  const all = projects ?? [];

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await createProject.mutateAsync({ name: name.trim(), material: material.trim() });
      setName("");
      setMaterial("");
      setShowForm(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create project");
    }
  }, [name, material, createProject]);

  return (
    <Page
      eyebrow="Workspace"
      title="Projects"
      description="Organize raw data, analyses, notes, and reports in one scientific record."
      actions={
        <button className="button primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} /> New project
        </button>
      }
    >
      {showForm && (
        <div className="card" style={{ marginBottom: 16, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Create project</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={{ flex: 1, minWidth: 200 }} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material formula (optional)" style={{ flex: 1, minWidth: 200 }} onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <button className="button primary" onClick={handleCreate} disabled={!name.trim() || createProject.isPending}>
              {createProject.isPending ? <Loader2 size={14} className="spin" /> : null}
              {createProject.isPending ? "Creating…" : "Create"}
            </button>
          </div>
          {error && <p style={{ color: "var(--error)", marginTop: 8, fontSize: 13 }}>{error}</p>}
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : all.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, color: "var(--text-muted)", marginBottom: 12, opacity: 0.4 }}>📁</div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No projects yet</p>
          <p className="muted" style={{ fontSize: 13 }}>Create one to organize your research.</p>
        </div>
      ) : (
        <div className="grid three">
          {all.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card"
              style={{ textDecoration: "none", color: "inherit", padding: "20px", transition: "border-color 0.15s ease, transform 0.15s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent-orange)" }}>P</span>
                </div>
                <ArrowUpRight size={14} color="var(--text-muted)" />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.name}</h2>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>{p.material || "No material specified"}</p>
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.files} files · {p.analyses} analyses</span>
                <span className={`badge ${p.status === "Complete" ? "good" : p.status === "Active" ? "info" : ""}`} style={{ fontSize: 10 }}>{p.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
