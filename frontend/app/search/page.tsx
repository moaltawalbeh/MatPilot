"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useState, useRef, useEffect } from "react";
import { useGlobalSearch } from "@/hooks/use-api";
import { Search, Loader2, Beaker, Atom, FlaskConical, FolderOpen, Microscope } from "lucide-react";
import Link from "next/link";

const TYPE_TABS = [
  { key: "", label: "All" },
  { key: "sample", label: "Samples", icon: Beaker },
  { key: "measurement", label: "Measurements", icon: Microscope },
  { key: "structure", label: "Structures", icon: Atom },
  { key: "project", label: "Projects", icon: FolderOpen },
] as const;

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  sample: { bg: "var(--accent-orange-bg)", fg: "var(--accent-orange)" },
  measurement: { bg: "var(--accent-blue-bg, #1e3a5f)", fg: "var(--accent-blue, #60a5fa)" },
  structure: { bg: "var(--accent-green-bg, #14532d)", fg: "var(--accent-green, #4ade80)" },
  experiment: { bg: "var(--accent-purple-bg, #3b1764)", fg: "var(--accent-purple, #c084fc)" },
  project: { bg: "var(--accent-yellow-bg, #422006)", fg: "var(--accent-yellow, #facc15)" },
  collection: { bg: "var(--accent-orange-bg)", fg: "var(--accent-orange)" },
};

const TYPE_ROUTES: Record<string, string> = {
  sample: "/samples",
  measurement: "/measurements",
  structure: "/structures",
  experiment: "/experiments",
  project: "/projects",
  collection: "/collections",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  sample: Beaker,
  measurement: Microscope,
  structure: Atom,
  experiment: FlaskConical,
  project: FolderOpen,
  collection: FolderOpen,
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isLoading } = useGlobalSearch(query, activeType || undefined);

  const items: any[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <AppShell>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* Search Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-primary)", marginBottom: 6 }}>
            Search &amp; Match
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 20 }}>
            Find samples, measurements, structures, projects, and more.
          </p>

          <div style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, formula, description, tags..."
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                fontSize: 16,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-orange)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
            />
          </div>
        </div>

        {/* Type Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 24,
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: 8,
            flexWrap: "wrap",
          }}
        >
          {TYPE_TABS.map((tab) => {
            const active = activeType === tab.key;
            const Icon = "icon" in tab ? tab.icon : Search;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 450,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: active ? "var(--accent-orange-bg)" : "transparent",
                  color: active ? "var(--accent-orange)" : "var(--text-secondary)",
                }}
              >
                {Icon && <Icon size={14} />}
                {tab.label}
              </button>
            );
          })}
          {query && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", alignSelf: "center" }}>
              {total} result{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  opacity: 0.5 + 0.15 * (3 - i),
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-3)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: "40%", borderRadius: 4, background: "var(--surface-3)", marginBottom: 8 }} />
                  <div style={{ height: 11, width: "65%", borderRadius: 4, background: "var(--surface-3)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && query && items.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--surface-2)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Search size={28} style={{ color: "var(--text-muted)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              No results found
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Try a different search term or adjust the type filter.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!isLoading && !query && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--accent-orange-bg)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <FlaskConical size={28} style={{ color: "var(--accent-orange)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              Start typing to search
            </p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              Search across all samples, measurements, structures, experiments, and projects.
            </p>
          </div>
        )}

        {/* Results */}
        {!isLoading && items.length > 0 && (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((item: any) => {
              const colors = TYPE_COLORS[item.type] ?? { bg: "var(--surface-2)", fg: "var(--text-muted)" };
              const Icon = TYPE_ICONS[item.type] ?? Beaker;
              const route = TYPE_ROUTES[item.type] ?? "#";

              return (
                <Link
                  key={item.id}
                  href={route}
                  className="card"
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "16px 18px",
                    alignItems: "flex-start",
                    textDecoration: "none",
                    transition: "border-color 0.15s ease, transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-md)",
                      background: colors.bg,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} style={{ color: colors.fg }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <strong style={{ fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </strong>
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          padding: "1px 7px",
                          borderRadius: 4,
                          background: colors.bg,
                          color: colors.fg,
                          flexShrink: 0,
                          textTransform: "capitalize",
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.description || "No description"}
                    </p>
                    {item.formula && (
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          marginTop: 4,
                          display: "inline-block",
                        }}
                      >
                        {item.formula}
                      </span>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {item.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--surface-2)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--surface-2)",
                              color: "var(--text-muted)",
                            }}
                          >
                            +{item.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
