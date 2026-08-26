"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FileBarChart,
  AudioLines,
  Waves,
  Sun,
  Clock,
  Trash2,
  MoreVertical,
  Search,
  FlaskConical,
  ArrowRight,
  Beaker,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import type { Project } from "@/types";

const INSTRUMENT_ICONS: Record<string, { icon: typeof FileBarChart; color: string }> = {
  xrd: { icon: FileBarChart, color: "var(--accent-orange)" },
  ftir: { icon: AudioLines, color: "var(--accent-emerald)" },
  raman: { icon: Waves, color: "var(--accent-cyan)" },
  uvvis: { icon: Sun, color: "var(--accent-amber)" },
};

const INSTRUMENTS = [
  { id: "xrd", name: "XRD", full: "X-ray Diffraction" },
  { id: "ftir", name: "FTIR", full: "FTIR Spectroscopy" },
  { id: "raman", name: "Raman", full: "Raman Spectroscopy" },
  { id: "uvvis", name: "UV-Vis", full: "UV-Vis Spectroscopy" },
];

function WorkspaceCard({ workspace, onDelete }: { workspace: Project; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const experimentCount = workspace.experiment_ids?.length ?? 0;
  const sampleCount = (workspace as any).sample_count ?? 0;
  const material = workspace.material || "";

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 0,
        transition: "all 0.2s ease",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent-orange)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(249,115,22,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
      onClick={() => window.location.href = `/workspaces/${workspace.id}`}
    >
      <div style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, color: "var(--text-primary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workspace.name}
            </h3>
            {material && (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 4 }}>
                Material: {material}
              </p>
            )}
          </div>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{
                width: 28, height: 28, borderRadius: "var(--radius-sm)",
                background: "transparent", border: "none",
                display: "grid", placeItems: "center",
                color: "var(--text-tertiary)", cursor: "pointer",
              }}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 4,
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
                minWidth: 140, zIndex: 20, overflow: "hidden",
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(workspace.id); setMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "8px 12px", border: "none",
                    background: "transparent", color: "var(--error)",
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {INSTRUMENTS.map((inst) => {
            const info = INSTRUMENT_ICONS[inst.id];
            return (
              <div
                key={inst.id}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 99,
                  background: `${info.color}12`,
                  fontSize: 10, fontWeight: 600,
                  color: info.color,
                }}
              >
                <info.icon size={10} />
                {inst.name}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        padding: "10px 20px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface-2)",
      }}>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-tertiary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <FlaskConical size={11} /> {experimentCount} experiments
          </span>
          {workspace.updated_at && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {new Date(workspace.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <ArrowRight size={14} style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const { data: projects, isLoading: loadingProjects } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMaterial, setNewMaterial] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = projects ?? [];
  const filteredProjects = searchQuery
    ? allProjects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.material || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProjects;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const result = await createProject.mutateAsync({
        name: newName.trim(),
        material: newMaterial.trim() || undefined,
        description: newDescription.trim() || undefined,
      });
      setShowCreate(false);
      setNewName("");
      setNewMaterial("");
      setNewDescription("");
      if (result?.id) {
        router.push(`/workspaces/${result.id}`);
      }
    } catch {
      // error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this workspace? This action cannot be undone.")) {
      await deleteProject.mutateAsync(id);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-primary)",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
              display: "grid", placeItems: "center",
              fontSize: 16, fontWeight: 800, color: "white",
            }}>M</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>MatPilot</h1>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: -2 }}>Materials Characterization Platform</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {user && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: "var(--radius-md)",
                background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                fontSize: 13, color: "var(--text-secondary)",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: "var(--accent-orange-bg)",
                  display: "grid", placeItems: "center",
                  fontSize: 11, fontWeight: 700, color: "var(--accent-orange)",
                }}>
                  {(user.username || "U")[0].toUpperCase()}
                </div>
                {user.username}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px 80px" }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--accent-orange)", fontWeight: 600, marginBottom: 6 }}>
              Research Environment
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 750, letterSpacing: "-0.5px" }}>My Workspaces</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
              Organize your research projects. Each workspace can contain XRD, FTIR, Raman, and UV-Vis analyses.
            </p>
          </div>
          <button
            className="button primary lg"
            onClick={() => setShowCreate(true)}
            style={{ flexShrink: 0 }}
          >
            <Plus size={16} /> New Workspace
          </button>
        </div>

        {/* Search */}
        {allProjects.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "0 12px",
              maxWidth: 400,
            }}>
              <Search size={14} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workspaces..."
                style={{
                  border: "none", background: "transparent", padding: "10px 0",
                  fontSize: 13, color: "var(--text-primary)", outline: "none", width: "100%",
                }}
              />
            </div>
          </div>
        )}

        {/* Workspace Grid */}
        {loadingProjects ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
        ) : filteredProjects.length === 0 && !searchQuery ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "80px 32px", textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: "var(--accent-orange-bg)",
              display: "grid", placeItems: "center", marginBottom: 20,
            }}>
              <FlaskConical size={32} style={{ color: "var(--accent-orange)" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 650, marginBottom: 8 }}>No workspaces yet</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
              Create your first workspace to begin organizing your materials characterization research. Each workspace supports XRD, FTIR, Raman, and UV-Vis analysis.
            </p>
            <button
              className="button primary lg"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} /> Create Workspace
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 32px", color: "var(--text-tertiary)" }}>
            No workspaces match your search.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filteredProjects.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Workspace</h2>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  width: 28, height: 28, borderRadius: "var(--radius-sm)",
                  background: "transparent", border: "none",
                  color: "var(--text-tertiary)", cursor: "pointer",
                  display: "grid", placeItems: "center", fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., BiFeO3 Materials Study"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Material / Formula
                </label>
                <input
                  type="text"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="e.g., BiFeO3, TiO2, graphene"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description of this research project..."
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="button" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                className="button primary"
                onClick={handleCreate}
                disabled={!newName.trim() || createProject.isPending}
              >
                {createProject.isPending ? "Creating..." : "Create Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
