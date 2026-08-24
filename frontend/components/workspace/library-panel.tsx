"use client";

import { useState } from "react";
import { Search, Loader2, BookOpenText, X } from "lucide-react";
import {
  useInstrumentReferenceSearch,
  useInstrumentReferenceMatch,
} from "@/hooks/use-api";
import type { InstrumentTechnique } from "@/types";

export default function LibraryPanel({
  projectId,
  technique,
}: {
  projectId: string;
  technique: InstrumentTechnique;
}) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [matchTarget, setMatchTarget] = useState<string | null>(null);

  const { data: refSearch, isLoading: loadingSearch } = useInstrumentReferenceSearch(
    projectId,
    technique,
    submitted,
  );
  const { data: refMatch, isLoading: loadingMatch } = useInstrumentReferenceMatch(
    projectId,
    technique,
    matchTarget,
  );

  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          <BookOpenText size={16} style={{ color: "var(--accent-amber)" }} />
          Spectral Reference Library
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Search references (e.g. poly, silicon, PS)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmitted(query.trim());
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: 13,
              minWidth: 240,
            }}
          />
          <button className="button" onClick={() => setSubmitted(query.trim())} style={{ fontSize: 13 }}>
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {submitted && (
        <div style={{ marginBottom: 12 }}>
          {loadingSearch ? (
            <Loader2 size={16} className="spin" style={{ color: "var(--text-muted)" }} />
          ) : refSearch && refSearch.results.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {refSearch.results.slice(0, 12).map((res) => (
                <span
                  key={res.reference_id}
                  title={`${res.formula ?? ""} · ${res.source}`}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {res.title}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              No reference matches for &ldquo;{submitted}&rdquo;.
            </p>
          )}
        </div>
      )}

      {loadingMatch ? (
        <Loader2 size={16} className="spin" style={{ color: "var(--text-muted)" }} />
      ) : refMatch ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6 }}>
            MATCH RESULTS · {refMatch.matches.length} candidate
            {refMatch.matches.length !== 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {refMatch.matches.slice(0, 6).map((m, i) => (
              <div
                key={`${m.reference.reference_id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 44,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 99,
                    background: i === 0 ? "var(--accent-emerald)" : "var(--bg-tertiary)",
                    color: i === 0 ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {m.score.toFixed(0)}
                </span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {m.reference.title}
                </span>
                {m.reference.formula && (
                  <span style={{ color: "var(--text-tertiary)" }}>{m.reference.formula}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {matchTarget && (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Matching experiment data against the reference library…
        </p>
      )}
    </div>
  );
}
