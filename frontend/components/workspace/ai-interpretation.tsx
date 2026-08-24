"use client";

import { useState } from "react";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { useInterpretInstrumentExperiment } from "@/hooks/use-api";
import type { InstrumentTechnique } from "@/types";

export default function AiInterpretation({
  projectId,
  technique,
  experimentId,
  name,
}: {
  projectId: string;
  technique: InstrumentTechnique;
  experimentId: string;
  name?: string;
}) {
  const interpret = useInterpretInstrumentExperiment(projectId);
  const [output, setOutput] = useState<{
    interpretation: string;
    model: string;
  } | null>(null);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      const res = await interpret.mutateAsync({
        technique,
        experimentId,
        question: question.trim() || undefined,
      });
      setOutput(res);
    } catch (err) {
      setError(String(err));
    }
  };

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
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Sparkles size={16} style={{ color: "var(--accent-amber)" }} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          AI Interpretation
        </h3>
        {output?.model && output.model !== "none" && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 99,
              background: "var(--bg-tertiary)",
              color: "var(--text-tertiary)",
            }}
          >
            {output.model}
          </span>
        )}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 10 }}>
        Ask the assistant to interpret the {name ?? "experiment"} analysis with
        technique-specific domain knowledge.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          placeholder="Optional: refine the question (e.g. Is carbonyl present?)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            fontSize: 13,
          }}
        />
        <button
          className="button"
          onClick={run}
          disabled={interpret.isPending}
          style={{ fontSize: 13 }}
        >
          {interpret.isPending && <Loader2 size={14} className="spin" />}
          {output ? <RotateCcw size={14} /> : <Sparkles size={14} />}
          {output ? "Re-interpret" : "Interpret"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "var(--accent-rose)",
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {output && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            maxHeight: 420,
            overflowY: "auto",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {output.interpretation}
        </div>
      )}
    </div>
  );
}
