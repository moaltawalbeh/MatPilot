"use client";

import { Page } from "@/components/ui/page";
import { useProviders } from "@/hooks/use-api";
import { Search, SlidersHorizontal, Loader2, Database as DatabaseIcon } from "lucide-react";
import { useState } from "react";

export default function Database() {
  const { data: providers, isLoading } = useProviders();
  const [query, setQuery] = useState("");

  const allProviders = providers ?? [];
  const filtered = query
    ? allProviders.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.display_name.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase()),
      )
    : allProviders;

  return (
    <Page
      eyebrow="Reference knowledge"
      title="Materials database"
      description="Search crystallographic references across connected scientific sources."
    >
      <section className="card">
        <div className="composer">
          <Search size={16} style={{ margin: "7px 0 0 7px" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers, materials, or structures…"
          />
          <button>
            <SlidersHorizontal size={14} />
          </button>
        </div>
        <div className="formats" style={{ justifyContent: "start" }}>
          {allProviders.map((p) => (
            <span className="badge" key={p.name}>
              {p.display_name}
            </span>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : (
        <div className="grid three" style={{ marginTop: 16 }}>
          {filtered.map((p) => (
            <section className="card" key={p.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="badge">{p.display_name}</span>
                <span
                  className={`badge ${p.is_available ? "good" : ""}`}
                  style={{ fontSize: 11 }}
                >
                  {p.is_available ? "Available" : "Unavailable"}
                </span>
              </div>
              <h2 style={{ marginTop: 18, fontSize: 18 }}>
                <DatabaseIcon size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                {p.name}
              </h2>
              <p className="muted" style={{ lineHeight: 1.5 }}>
                {p.description}
              </p>
              <div
                style={{
                  borderTop: "1px solid #263545",
                  paddingTop: 13,
                  marginTop: 18,
                }}
              >
                <div className="formats" style={{ justifyContent: "start", gap: 4 }}>
                  {p.supported_features.slice(0, 3).map((f) => (
                    <span className="badge" key={f} style={{ fontSize: 10 }}>
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                  {p.supported_features.length > 3 && (
                    <span className="muted" style={{ fontSize: 10 }}>
                      +{p.supported_features.length - 3} more
                    </span>
                  )}
                </div>
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
    </Page>
  );
}
