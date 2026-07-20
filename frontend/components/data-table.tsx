"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";

export type ColumnDef<T> = {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pageSize?: number;
  showPagination?: boolean;
  keyExtractor?: (item: T) => string;
};

type SortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
  pageSize = 20,
  showPagination = true,
  keyExtractor,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  const totalPages = Math.ceil(sortedData.length / pageSizeState);
  const pagedData = showPagination
    ? sortedData.slice(page * pageSizeState, (page + 1) * pageSizeState)
    : sortedData;

  const renderSortIcon = (key: string) => {
    if (sort?.key !== key) return <ChevronsUpDown size={13} style={{ opacity: 0.4 }} />;
    return sort.direction === "asc"
      ? <ChevronUp size={13} style={{ color: "var(--accent-orange)" }} />
      : <ChevronDown size={13} style={{ color: "var(--accent-orange)" }} />;
  };

  if (loading) {
    return (
      <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{
                  textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.5px",
                  textTransform: "uppercase", color: "var(--text-muted)", padding: "10px 16px",
                  borderBottom: "1px solid var(--border-subtle)", width: col.width, whiteSpace: "nowrap",
                }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="skeleton" style={{ height: 14, width: "80%", borderRadius: 4 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (pagedData.length === 0) {
    return (
      <div style={{
        background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)", padding: 60, textAlign: "center",
      }}>
        <Inbox size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
        <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.5px",
                    textTransform: "uppercase", color: "var(--text-muted)", padding: "10px 16px",
                    borderBottom: "1px solid var(--border-subtle)", width: col.width,
                    whiteSpace: "nowrap", cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none", transition: "color 0.15s",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.header}
                    {col.sortable && renderSortIcon(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((item, idx) => {
              const rowKey = keyExtractor
                ? keyExtractor(item)
                : String((item as Record<string, unknown>).id ?? idx);
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  style={{
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{
                      padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)",
                      color: "var(--text-secondary)",
                    }}>
                      {col.render
                        ? col.render(item, idx)
                        : String((item as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showPagination && totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderTop: "1px solid var(--border-subtle)", fontSize: 13,
          color: "var(--text-tertiary)",
        }}>
          <span>
            Showing {page * pageSizeState + 1}–{Math.min((page + 1) * pageSizeState, sortedData.length)} of {sortedData.length}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={pageSizeState}
              onChange={(e) => { setPageSizeState(Number(e.target.value)); setPage(0); }}
              style={{
                background: "var(--surface-2)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)", padding: "4px 8px", fontSize: 12,
                color: "var(--text-secondary)", cursor: "pointer",
              }}
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{
                padding: "4px 10px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)", background: "var(--surface-2)",
                color: "var(--text-secondary)", fontSize: 12, cursor: page === 0 ? "not-allowed" : "pointer",
                opacity: page === 0 ? 0.4 : 1,
              }}
            >Prev</button>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              style={{
                padding: "4px 10px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)", background: "var(--surface-2)",
                color: "var(--text-secondary)", fontSize: 12,
                cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                opacity: page >= totalPages - 1 ? 0.4 : 1,
              }}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
