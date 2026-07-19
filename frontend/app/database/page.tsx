"use client";

import { Page } from "@/components/ui/page";
import { useProviders, useUploads } from "@/hooks/use-api";
import { Search, Loader2, Database as DatabaseIcon, CheckCircle2, AlertCircle, RefreshCw, Package, Server, HardDrive, Activity, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";

export default function Database() {
  const { data: providers, isLoading: providersLoading, refetch: refetchProviders } = useProviders();
  const { data: uploads } = useUploads();
  const [query, setQuery] = useState("");

  const allProviders = providers ?? [];
  const filtered = query ? allProviders.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.display_name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase())) : allProviders;
  const availableCount = allProviders.filter((p) => p.is_available).length;
  const unavailableCount = allProviders.filter((p) => !p.is_available).length;
  const cachedFiles = uploads ?? [];

  return (
    <Page
      eyebrow="Reference knowledge"
      title="Materials Database"
      description="Search crystallographic references and manage connected scientific sources."
    >
      {/* Status Overview */}
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {[
          { label: "Providers", value: String(allProviders.length), sub: `${availableCount} available`, icon: Server, color: "var(--accent-orange)" },
          { label: "Local Cache", value: String(cachedFiles.length), sub: "Uploaded files", icon: HardDrive, color: "var(--accent-cyan)" },
          { label: "Reference Engine", value: "Active", sub: "Local DB + pymatgen", icon: Activity, color: "var(--accent-emerald)" },
          { label: "Connectivity", value: unavailableCount === 0 ? "All Online" : `${unavailableCount} Offline`, sub: unavailableCount === 0 ? "All sources reachable" : "Some unreachable", icon: unavailableCount === 0 ? Wifi : WifiOff, color: unavailableCount === 0 ? "var(--accent-emerald)" : "var(--error)" },
        ].map((m) => (
          <div className="card" key={m.label} style={{ padding: "16px 20px", display: "flex", gap: 12, alignItems: "start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: `${m.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <m.icon size={15} style={{ color: m.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.label}</div>
              <div className="number" style={{ fontSize: 20 }}>{m.value}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="composer">
          <Search size={15} style={{ marginLeft: 8, color: "var(--text-muted)" }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers, materials, or structures\u2026" />
          <button onClick={() => refetchProviders()} title="Refresh"><RefreshCw size={14} /></button>
        </div>
      </section>

      {/* Provider Cards */}
      {providersLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} className="spin" style={{ color: "var(--text-muted)" }} /></div>
      ) : (
        <div className="grid three">
          {filtered.map((p) => (
            <section className="card" key={p.name} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span className="badge indigo">{p.display_name}</span>
                <span className={`badge ${p.is_available ? "good" : "bad"}`} style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}>
                  {p.is_available ? <><CheckCircle2 size={9} /> Available</> : <><AlertCircle size={9} /> Unavailable</>}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <DatabaseIcon size={15} style={{ color: "var(--accent-orange)" }} />
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5, marginBottom: 14 }}>{p.description}</p>
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {p.supported_features.slice(0, 3).map((f) => (
                    <span className="badge" key={f} style={{ fontSize: 10 }}>{f.replace(/_/g, " ")}</span>
                  ))}
                  {p.supported_features.length > 3 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{p.supported_features.length - 3} more</span>}
                </div>
                {p.version && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>Version: {p.version}</div>}
              </div>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
              <p className="muted">No providers match your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Cached Files */}
      {cachedFiles.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section">
            <div>
              <h2>Cached Reference Files</h2>
              <span className="muted">{cachedFiles.length} file{cachedFiles.length !== 1 ? "s" : ""} uploaded</span>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {cachedFiles.slice(0, 6).map((file) => (
                <div key={file.file_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", fontSize: 12 }}>
                  <Package size={14} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.filename}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{file.detected_format.toUpperCase()} · {new Date(file.uploaded_at).toLocaleDateString()}</div>
                  </div>
                  {file.is_valid ? <CheckCircle2 size={12} style={{ color: "var(--success)" }} /> : <AlertCircle size={12} style={{ color: "var(--error)" }} />}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}
