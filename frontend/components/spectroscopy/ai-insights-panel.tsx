"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Send, Lightbulb } from "lucide-react";
import { API_URL } from "../../lib/api-client";
import type { SpectrumAnalysisResult, SpectroscopyTechnique } from "../../types";
import { getTechnique } from "./technique-config";

type AiInsightsPanelProps = {
  technique: SpectroscopyTechnique;
  analysis?: SpectrumAnalysisResult | null;
  filename?: string;
  disabled: boolean;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:1.05em;display:block;margin:6px 0 2px;">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size:1.1em;display:block;margin:8px 0 3px;">$1</strong>');
  html = html.replace(/^# (.+)$/gm, '<strong style="font-size:1.15em;display:block;margin:8px 0 3px;">$1</strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/`([^`]+?)`/g, '<code style="background:var(--surface-2);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em;">$1</code>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;margin:2px 0;"><span style="font-weight:600;margin-right:4px;">$1.</span>$2</div>');
  html = html.replace(/^[\-\*] (.+)$/gm, '<div style="padding-left:16px;margin:2px 0;"><span style="margin-right:6px;">•</span>$1</div>');
  html = html.replace(/\n/g, "<br/>");
  return html;
}

function buildPrompt(technique: SpectroscopyTechnique, analysis: SpectrumAnalysisResult | null | undefined, filename?: string): string {
  const info = getTechnique(technique);
  const label = info.label;
  const axis = info.xUnit;
  const fileLine = filename ? ` The file is "${filename}".` : "";
  if (!analysis || !analysis.peaks || analysis.peaks.length === 0) {
    return `I have uploaded a ${label} spectrum${fileLine}. No peaks were detected yet. Suggest what functional groups, bands or features to look for in the ${axis} range for a ${label} measurement, and how to improve peak detection.`;
  }
  const peakLines = analysis.peaks
    .slice(0, 12)
    .map((p) => `- ${Number(p.position).toFixed(2)} ${axis} (intensity ${Number(p.intensity).toFixed(1)}${p.assignment ? `, assignment: ${p.assignment}` : ""})`)
    .join("\n");
  return `Please interpret this ${label} spectrum${fileLine}. Detected peaks:\n${peakLines}\n\nIdentify the likely functional groups / bands / bonds, give a scientific interpretation, flag anything unusual, and suggest next steps (e.g. complementary techniques). Be concise but thorough.`;
}

export function AiInsightsPanel({ technique, analysis, filename, disabled }: AiInsightsPanelProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setInsight(null);
    setError(null);
    return () => abortRef.current?.abort();
  }, [technique, filename, analysis]);

  const requestInsight = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`${API_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: buildPrompt(technique, analysis, filename) }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail ?? data?.error?.message ?? `Request failed (${res.status})`);
      }
      setInsight(data?.response ?? "No response received.");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError((err as Error)?.message ?? "Could not generate insight. Check GROQ_API_KEY.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const hasPeaks = Boolean(analysis?.peaks && analysis.peaks.length > 0);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>AI insights</h2>
          <span className="muted">Interpret this spectrum with MatPilot AI</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {insight ? (
          <>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.7,
                color: "var(--text-primary)",
                maxHeight: 320,
                overflowY: "auto",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(insight) }}
            />
            <button className="button ghost" onClick={requestInsight} disabled={loading} style={{ alignSelf: "flex-start" }}>
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              Regenerate
            </button>
          </>
        ) : (
          <>
            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--error)",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(239, 68, 68, 0.07)",
                  border: "1px solid rgba(239, 68, 68, 0.18)",
                }}
              >
                {error}
              </div>
            )}
            <button
              className="button primary"
              onClick={requestInsight}
              disabled={loading || disabled}
              style={{ width: "100%" }}
            >
              {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Lightbulb size={14} />}
              {loading ? "Generating insight…" : hasPeaks ? "Interpret my spectrum" : "Get guidance"}
            </button>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: -6 }}>
              {disabled
                ? "Upload a spectrum to get AI-powered interpretation."
                : hasPeaks
                  ? "Sends your detected peaks to the MatPilot AI for band assignment and interpretation."
                  : "Ask the AI what to look for before running analysis."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
