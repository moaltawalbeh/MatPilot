"use client";

import { Page } from "@/components/ui/page";
import { useSamples } from "@/hooks/use-api";
import { Plus, Loader2, ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = ["", "Active", "Archived", "Pending"];
const CRYSTAL_SYSTEMS = ["", "Cubic", "Hexagonal", "Tetragonal", "Orthorhombic", "Monoclinic", "Triclinic", "Rhombohedral"];

export default function SamplesPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSamples({ status: status || undefined, search: search || undefined });

  const samples: any[] = data?.samples ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Enterprise"
      title="Samples"
      description="Manage and track material samples across your laboratory."
      actions={
        <button className="button primary" onClick={() => console.log("New Sample")}>
          <Plus size={15} /> New Sample
        </button>
      }
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search samples..."
            style={{ width: "100%", paddingLeft: 32 }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <section className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Formula</th>
              <th>Status</th>
              <th>Crystal System</th>
              <th>Measurements</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}><Loader2 size={20} className="spin" style={{ color: "var(--text-muted)" }} /></td></tr>
            ) : samples.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 48, color: "var(--text-tertiary)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🧪</div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No samples found</p>
                  <p style={{ fontSize: 13 }}>Create a new sample to start tracking your materials.</p>
                </td>
              </tr>
            ) : (
              samples.map((s: any) => (
                <tr
                  key={s.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => { console.log("Navigate to sample", s.id); alert(`Sample: ${s.name}`); }}
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, color: "var(--accent-orange)", flexShrink: 0 }}>
                        S
                      </div>
                      <div>
                        <strong>{s.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{s.formula || "—"}</td>
                  <td>
                    <span className={`badge ${s.status === "Active" ? "info" : s.status === "Archived" ? "" : ""}`} style={{ fontSize: 10 }}>
                      {s.status || "Active"}
                    </span>
                  </td>
                  <td>{s.crystal_system || "—"}</td>
                  <td>{s.measurements_count ?? s.measurements ?? 0}</td>
                  <td style={{ color: "var(--text-tertiary)" }}>{s.created_at?.slice(0, 10) || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </Page>
  );
}
