"use client";
import { useCallback, useRef, useState } from "react";
import { List, Pin } from "lucide-react";

export type ChartAnnotation = {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
};

export function useChartAnnotations() {
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [annotateMode, setAnnotateMode] = useState(false);
  const nextId = useRef(0);

  const addAnnotation = useCallback((x: number, y: number, label: string, color?: string) => {
    const id = `ann-${nextId.current++}`;
    setAnnotations((prev) => [...prev, { id, x, y, label, color }]);
    return id;
  }, []);

  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAnnotations = useCallback(() => setAnnotations([]), []);

  return { annotations, annotateMode, setAnnotateMode, addAnnotation, removeAnnotation, clearAnnotations };
}

export type PeakListItem = {
  id: string;
  label: string;
  sublabel?: string;
  color?: string;
};

type PeakListPanelProps = {
  items: PeakListItem[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  selectedIds: Set<string>;
  onToggle: (id: string, multi: boolean) => void;
  countLabel?: string;
};

export function PeakListPanel({ items, hoveredId, onHover, selectedIds, onToggle, countLabel = "Peaks" }: PeakListPanelProps) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="button ghost sm"
        title="Peak list — hover to highlight, click to pin, Shift/Ctrl+click to multi-select"
        style={{ height: 24, padding: "0 6px", background: open ? "var(--surface-2, #f3f4f6)" : undefined }}
      >
        <List size={12} />
        <span style={{ fontSize: 11 }}>{countLabel}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>{items.length}</span>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 19 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 28,
              zIndex: 20,
              minWidth: 210,
              maxHeight: 264,
              overflowY: "auto",
              background: "var(--bg-elevated, #fff)",
              border: "1px solid var(--border-default, #ddd)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: 4,
            }}
          >
            {items.length === 0 && <div style={{ padding: "8px 10px", fontSize: 11, color: "var(--text-muted)" }}>No peaks</div>}
            {items.map((it) => {
              const selected = selectedIds.has(it.id);
              const hovered = hoveredId === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onMouseEnter={() => onHover(it.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={(e) => {
                    onToggle(it.id, e.shiftKey || e.ctrlKey || e.metaKey);
                    setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "100%",
                    padding: "4px 8px",
                    borderRadius: 5,
                    border: "none",
                    background: selected ? "rgba(249,115,22,0.14)" : hovered ? "var(--surface-2, #f3f4f6)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: it.color || "var(--accent-orange, #f97316)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 11, color: "var(--text-primary)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}>
                    {it.label}
                  </span>
                  {it.sublabel && <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>{it.sublabel}</span>}
                  {selected && <Pin size={9} style={{ color: "var(--accent-orange, #f97316)" }} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function toggleInSet(prev: Set<string>, id: string, multi: boolean): Set<string> {
  const next = new Set(prev);
  if (multi) {
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }
  if (next.has(id) && next.size === 1) return new Set();
  return new Set([id]);
}
