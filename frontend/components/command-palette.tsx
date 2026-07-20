"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, FileText, FolderKanban, FlaskConical, Upload, Plus, Clock, ArrowRight, Beaker, Ruler, Box, Download, Settings, Shield, BarChart3, FileUp, SearchCode } from "lucide-react";
import { useRouter } from "next/navigation";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
  group: "Navigation" | "Recent" | "Actions" | "Settings";
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Ctrl+D",
        icon: FileText,
        group: "Navigation",
        action: () => router.push("/dashboard"),
      },
      {
        id: "nav-projects",
        label: "Projects",
        description: "Browse all projects",
        icon: FolderKanban,
        group: "Navigation",
        action: () => router.push("/projects"),
      },
      {
        id: "nav-experiments",
        label: "Experiments",
        description: "Manage experiments",
        icon: FlaskConical,
        group: "Navigation",
        action: () => router.push("/experiments"),
      },
      {
        id: "nav-samples",
        label: "Samples",
        description: "View sample catalog",
        icon: Beaker,
        group: "Navigation",
        action: () => router.push("/samples"),
      },
      {
        id: "nav-measurements",
        label: "Measurements",
        description: "Measurement data",
        icon: Ruler,
        group: "Navigation",
        action: () => router.push("/measurements"),
      },
      {
        id: "nav-structures",
        label: "Structures",
        description: "Crystal structures",
        icon: Box,
        group: "Navigation",
        action: () => router.push("/structures"),
      },
      {
        id: "nav-collections",
        label: "Collections",
        description: "Browse collections",
        icon: FolderKanban,
        group: "Navigation",
        action: () => router.push("/collections"),
      },
      {
        id: "nav-downloads",
        label: "Downloads",
        description: "Download history",
        icon: Download,
        group: "Navigation",
        action: () => router.push("/downloads"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        description: "App preferences",
        icon: Settings,
        group: "Settings",
        action: () => router.push("/settings"),
      },
      {
        id: "nav-admin",
        label: "Admin",
        description: "Administration panel",
        icon: Shield,
        group: "Settings",
        action: () => router.push("/admin"),
      },
      {
        id: "recent-project-1",
        label: "Li-ion Cathode Screening",
        description: "Updated 2 hours ago",
        icon: Clock,
        group: "Recent",
        action: () => router.push("/projects/1"),
      },
      {
        id: "recent-experiment-1",
        label: "XRD Refinement - Sample #42",
        description: "Updated yesterday",
        icon: Clock,
        group: "Recent",
        action: () => router.push("/experiments/5"),
      },
      {
        id: "action-new-project",
        label: "New Project",
        description: "Ctrl+N",
        icon: Plus,
        group: "Actions",
        action: () => router.push("/projects/new"),
      },
      {
        id: "action-new-sample",
        label: "New Sample",
        description: "Create a new sample",
        icon: Plus,
        group: "Actions",
        action: () => router.push("/samples/new"),
      },
      {
        id: "action-upload",
        label: "Upload Data",
        description: "Ctrl+U",
        icon: Upload,
        group: "Actions",
        action: () => router.push("/upload"),
      },
      {
        id: "action-upload-file",
        label: "Upload File",
        description: "Import a data file",
        icon: FileUp,
        group: "Actions",
        action: () => router.push("/upload"),
      },
      {
        id: "action-search",
        label: "Search",
        description: "Ctrl+K",
        icon: SearchCode,
        group: "Actions",
        action: () => {},
      },
      {
        id: "action-reports",
        label: "View Reports",
        description: "Analytics & reports",
        icon: BarChart3,
        group: "Actions",
        action: () => router.push("/reports"),
      },
      {
        id: "action-new-experiment",
        label: "New Experiment",
        description: "Create a new experiment",
        icon: Plus,
        group: "Actions",
        action: () => router.push("/experiments/new"),
      },
    ],
    [router],
  );

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase().trim();
    const groups: { group: string; items: CommandItem[] }[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (q && !item.label.toLowerCase().includes(q)) continue;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const existing = groups.find((g) => g.group === item.group);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ group: item.group, items: [item] });
      }
    }
    return groups;
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const flatFiltered = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups],
  );

  const executeSelected = useCallback(() => {
    if (flatFiltered[selectedIndex]) {
      onClose();
      flatFiltered[selectedIndex].action();
    }
  }, [flatFiltered, selectedIndex, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeSelected();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [flatFiltered.length, executeSelected, onClose],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        paddingTop: "15vh",
        zIndex: 200,
        animation: "fade-in 0.15s ease",
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "60vh",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "fade-in-scale 0.2s var(--ease-out)",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Search size={16} color="var(--text-tertiary)" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands, pages, or recent items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {filteredGroups.length === 0 && (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--text-tertiary)",
                fontSize: 13,
              }}
            >
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
          {filteredGroups.map((group) => (
            <div key={group.group} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.8px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {group.group}
              </div>
              {group.items.map((item) => {
                const idx = flatFiltered.indexOf(item);
                const selected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onClose();
                      item.action();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      cursor: "pointer",
                      background: selected
                        ? "var(--accent-orange-bg)"
                        : "transparent",
                      color: selected
                        ? "var(--accent-orange)"
                        : "var(--text-primary)",
                      fontSize: 13,
                      textAlign: "left",
                      transition: "all 0.1s",
                    }}
                  >
                    <item.icon size={16} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: selected ? 600 : 450 }}>
                        {item.label}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            marginTop: 1,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                    {selected && <ArrowRight size={14} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
