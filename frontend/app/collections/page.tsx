"use client";

import { Page } from "@/components/ui/page";
import { useCollections } from "@/hooks/use-api";
import { Plus, Loader2, FolderOpen } from "lucide-react";
import { useState } from "react";

const TYPE_OPTIONS = ["", "Dataset", "Analysis", "Reference", "Custom"];

export default function CollectionsPage() {
  const [type, setType] = useState("");
  const { data, isLoading } = useCollections({ collection_type: type || undefined });

  const collections: any[] = data?.collections ?? (Array.isArray(data) ? data : []);

  return (
    <Page
      eyebrow="Enterprise"
      title="Collections"
      description="Organize samples, measurements, and structures into logical groups."
      actions={
        <button className="button primary" onClick={() => console.log("New Collection")}>
          <Plus size={15} /> New Collection
        </button>
      }
    >
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)", fontSize: 13 }}
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.filter(Boolean).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Card Grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}><Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : collections.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, color: "var(--text-muted)", marginBottom: 12, opacity: 0.4 }}>📂</div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No collections yet</p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Create a collection to group related samples and data.</p>
        </div>
      ) : (
        <div className="grid three">
          {collections.map((c: any) => (
            <div
              key={c.id}
              className="card"
              style={{
                padding: 20, cursor: "pointer", transition: "border-color 0.15s ease, transform 0.15s ease",
              }}
              onClick={() => console.log("Navigate to collection", c.id)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center" }}>
                  <FolderOpen size={17} style={{ color: "var(--accent-orange)" }} />
                </div>
                <span className={`badge ${c.collection_type === "Dataset" ? "info" : c.collection_type === "Analysis" ? "good" : ""}`} style={{ fontSize: 10 }}>
                  {c.collection_type || "Custom"}
                </span>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.name}</h2>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.5 }}>
                {c.description || "No description"}
              </p>
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.item_count ?? c.items_count ?? 0} items</span>
                {c.tags && c.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-muted)" }}>{tag}</span>
                    ))}
                    {c.tags.length > 2 && (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface-2)", color: "var(--text-muted)" }}>+{c.tags.length - 2}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
