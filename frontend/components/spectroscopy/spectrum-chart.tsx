"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Download, Maximize2, RotateCcw, ZoomIn, Activity, MapPin } from "lucide-react";
import type { SpectrumPeak } from "@/types";
import { PeakListPanel, toggleInSet, useChartAnnotations, type PeakListItem } from "@/components/charts/chart-interactions";

type ChartPoint = { x: number; y: number };

export type SpectrumChartSeries = {
  key: string;
  data: ChartPoint[];
  color: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
  label: string;
};

type SpectrumChartProps = {
  series: SpectrumChartSeries[];
  peaks?: SpectrumPeak[];
  xAxisLabel: string;
  yAxisLabel: string;
  height?: number;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const M = { top: 20, right: 20, bottom: 44, left: 66 };

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  const nice = round
    ? frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10
    : frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}

function makeTicks(dMin: number, dMax: number, maxTicks = 8): number[] {
  if (dMax <= dMin) return [dMin];
  const range = niceNum(dMax - dMin, false);
  const spacing = niceNum(range / (maxTicks - 1), true);
  if (spacing <= 0) return [dMin];
  const nMin = Math.floor(dMin / spacing) * spacing;
  const nMax = Math.ceil(dMax / spacing) * spacing;
  const ticks: number[] = [];
  for (let t = nMin; t <= nMax + spacing * 0.001; t += spacing) {
    ticks.push(parseFloat(t.toPrecision(12)));
  }
  return ticks;
}

function fmtTick(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return v.toFixed(0);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSvg(svgEl: SVGSVGElement, fmt: "png" | "svg", prefix: string) {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  if (fmt === "svg") {
    downloadBlob(new Blob([data], { type: "image/svg+xml;charset=utf-8" }), `${prefix}.svg`);
    return;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => b && downloadBlob(b, `${prefix}.png`), "image/png");
  };
  img.src = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
}

export function SpectrumChart({
  series,
  peaks,
  xAxisLabel,
  yAxisLabel,
  height = 420,
  title,
  emptyTitle = "No spectrum loaded",
  emptyDescription = "Upload a spectrum file to begin analysis.",
}: SpectrumChartProps) {
  const clipId = useId().replace(/:/g, "");
  const clipRef = `spectrum-clip-${clipId}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: height });
  const [view, setView] = useState<{ x0: number; x1: number; y0: number; y1: number } | null>(null);
  const [drag, setDrag] = useState<{ kind: "pan" | "box"; sx: number; sy: number; vx0: number; vy0: number; vx1: number; vy1: number } | null>(null);
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [mouse, setMouse] = useState<{ sx: number; sy: number } | null>(null);
  const [selectedPeaks, setSelectedPeaks] = useState<Set<string>>(new Set());
  const [hoveredPeakId, setHoveredPeakId] = useState<string | null>(null);
  const { annotations, annotateMode, setAnnotateMode, addAnnotation, removeAnnotation } = useChartAnnotations();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0) setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => {
      if (svgRef.current?.contains(e.target as Node)) e.preventDefault();
    };
    el.addEventListener("wheel", preventScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventScroll);
  }, []);

  const cw = dims.w - M.left - M.right;
  const ch = dims.h - M.top - M.bottom;

  const dataDomain = useMemo(() => {
    const xMin = Math.min(...series.flatMap((s) => s.data.map((p) => p.x)));
    const xMax = Math.max(...series.flatMap((s) => s.data.map((p) => p.x)));
    let yMin = Infinity, yMax = -Infinity;
    for (const s of series) for (const p of s.data) {
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    if (!isFinite(xMin)) return { x0: 0, x1: 1, y0: 0, y1: 1 };
    if (!isFinite(yMin)) { yMin = 0; yMax = 1; }
    const xPad = (xMax - xMin) * 0.01 || 1;
    const yPad = (yMax - yMin) * 0.05 || 1;
    return { x0: xMin - xPad, x1: xMax + xPad, y0: Math.min(0, yMin) - yPad, y1: yMax + yPad };
  }, [series]);

  const domain = view || dataDomain;

  const sx = useCallback((v: number) => M.left + ((v - domain.x0) / (domain.x1 - domain.x0)) * cw, [domain, cw]);
  const sy = useCallback((v: number) => M.top + ch - ((v - domain.y0) / (domain.y1 - domain.y0)) * ch, [domain, ch]);
  const invX = useCallback((px: number) => domain.x0 + ((px - M.left) / cw) * (domain.x1 - domain.x0), [domain, cw]);
  const invY = useCallback((py: number) => domain.y0 + ((M.top + ch - py) / ch) * (domain.y1 - domain.y0), [domain, ch]);

  const xTicks = useMemo(() => makeTicks(domain.x0, domain.x1, Math.max(4, Math.floor(cw / 90))), [domain, cw]);
  const yTicks = useMemo(() => makeTicks(domain.y0, domain.y1, Math.max(3, Math.floor(ch / 60))), [domain, ch]);

  const paths = useMemo(() => {
    const r: Record<string, string> = {};
    for (const s of series) {
      const parts: string[] = [];
      let active = false;
      for (const p of s.data) {
        if (!isFinite(p.y)) { active = false; continue; }
        const px = sx(p.x), py = sy(p.y);
        if (!active) { parts.push(`M${px.toFixed(1)},${py.toFixed(1)}`); active = true; }
        else parts.push(`L${px.toFixed(1)},${py.toFixed(1)}`);
      }
      r[s.key] = parts.join("");
    }
    return r;
  }, [series, sx, sy]);

  const peakItems = useMemo<PeakListItem[]>(() => {
    return (peaks ?? []).map((p, i) => ({
      id: `spk-${i}-${p.position.toFixed(3)}`,
      label: p.position.toFixed(2),
      sublabel: p.assignment || `I ${p.intensity.toFixed(0)}`,
      color: "#f43f5e",
    }));
  }, [peaks]);

  const togglePeak = useCallback((id: string, multi: boolean) => {
    setSelectedPeaks((prev) => toggleInSet(prev, id, multi));
  }, []);

  const hasData = series.some((s) => s.data.length > 0);
  const primary = series[0];
  let cursor = { x: 0, y: 0, value: 0, idx: -1, inside: false };
  if (mouse && primary && hasData) {
    cursor.x = invX(mouse.sx);
    cursor.y = invY(mouse.sy);
    cursor.inside = mouse.sx >= M.left && mouse.sx <= M.left + cw && mouse.sy >= M.top && mouse.sy <= M.top + ch;
    if (cursor.inside) {
      let lo = 0, hi = primary.data.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (primary.data[mid].x < cursor.x) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(primary.data[lo - 1].x - cursor.x) < Math.abs(primary.data[lo].x - cursor.x)) lo--;
      cursor.idx = lo;
      cursor.value = primary.data[lo]?.y ?? 0;
    }
  }

  let nearestPeak: SpectrumPeak | null = null;
  let nearestPeakDist = Infinity;
  if (cursor.inside && peaks && peaks.length > 0) {
    for (const p of peaks) {
      const dist = Math.abs(p.position - cursor.x);
      if (dist < nearestPeakDist) { nearestPeakDist = dist; nearestPeak = p; }
    }
    const tol = Math.max(0.5, (domain.x1 - domain.x0) * 0.008);
    if (nearestPeakDist > tol) nearestPeak = null;
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (!hasData) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = Math.max(M.left, Math.min(M.left + cw, e.clientX - rect.left));
    const cy = Math.max(M.top, Math.min(M.top + ch, e.clientY - rect.top));
    if (annotateMode) {
      e.preventDefault();
      addAnnotation(invX(cx), invY(cy), `${xAxisLabel.split(" (")[0]} = ${invX(cx).toFixed(2)}`);
      return;
    }
    const isBox = e.shiftKey;
    e.preventDefault();
    setDrag({ kind: isBox ? "box" : "pan", sx: cx, sy: cy, vx0: domain.x0, vy0: domain.y0, vx1: domain.x1, vy1: domain.y1 });
    if (isBox) setBox({ x1: cx, y1: cy, x2: cx, y2: cy });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setMouse({ sx: cx, sy: cy });
    if (!drag) return;
    if (drag.kind === "box") {
      setBox({ x1: drag.sx, y1: drag.sy, x2: cx, y2: cy });
    } else {
      const dx = -((cx - drag.sx) / cw) * (drag.vx1 - drag.vx0);
      const dy = ((cy - drag.sy) / ch) * (drag.vy1 - drag.vy0);
      setView({ x0: drag.vx0 + dx, x1: drag.vx1 + dx, y0: drag.vy0 + dy, y1: drag.vy1 + dy });
    }
  };

  const onMouseUp = () => {
    if (drag?.kind === "box" && box) {
      const bx0 = Math.min(box.x1, box.x2);
      const bx1 = Math.max(box.x1, box.x2);
      const by0 = Math.min(box.y1, box.y2);
      const by1 = Math.max(box.y1, box.y2);
      const newW = Math.abs(invX(bx1) - invX(bx0));
      const newH = Math.abs(invY(by0) - invY(by1));
      const minW = (drag.vx1 - drag.vx0) * 0.01;
      const minH = (drag.vy1 - drag.vy0) * 0.01;
      if (newW > minW && newH > minH) {
        setView({
          x0: Math.min(invX(bx0), invX(bx1)),
          x1: Math.max(invX(bx0), invX(bx1)),
          y0: Math.min(invY(by0), invY(by1)),
          y1: Math.max(invY(by0), invY(by1)),
        });
      }
    }
    setDrag(null);
    setBox(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!hasData) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = Math.max(M.left, Math.min(M.left + cw, e.clientX - rect.left));
    const cy = Math.max(M.top, Math.min(M.top + ch, e.clientY - rect.top));
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const cur = view || dataDomain;
    const fx = (cx - M.left) / cw;
    const fy = 1 - (cy - M.top) / ch;
    const newW = (cur.x1 - cur.x0) * factor;
    const newH = (cur.y1 - cur.y0) * factor;
    setView({
      x0: cur.x0 + fx * (cur.x1 - cur.x0) - fx * newW,
      x1: cur.x0 + fx * (cur.x1 - cur.x0) + (1 - fx) * newW,
      y0: cur.y0 + fy * (cur.y1 - cur.y0) - fy * newH,
      y1: cur.y0 + fy * (cur.y1 - cur.y0) + (1 - fy) * newH,
    });
  };

  if (!hasData) {
    return (
      <div className="chart" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, minHeight: 260 }}>
        <Activity size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{emptyTitle}</h3>
        <p style={{ fontSize: 13, textAlign: "center", maxWidth: 320, color: "var(--text-tertiary)" }}>{emptyDescription}</p>
      </div>
    );
  }

  const isZoomed = view !== null;

  return (
    <div className="chart" style={{ position: "relative", userSelect: drag ? "none" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px 0", flexShrink: 0, gap: 8, flexWrap: "wrap" }}>
        {title && (
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
        )}
        <div style={{ display: "flex", gap: 10, marginLeft: "auto", alignItems: "center" }}>
          {series.map((s) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: s.color, display: "inline-block", opacity: 0.9 }} />
              {s.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          {isZoomed && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 6, background: "var(--surface-2)", padding: "2px 7px", borderRadius: 4 }}>
              {fmtTick(domain.x0)}–{fmtTick(domain.x1)}
            </span>
          )}
          <PeakListPanel items={peakItems} hoveredId={hoveredPeakId} onHover={setHoveredPeakId} selectedIds={selectedPeaks} onToggle={togglePeak} countLabel="Peaks" />
          <button
            onClick={() => setAnnotateMode((m) => !m)}
            className="button ghost sm"
            title="Toggle annotation mode — click the chart to place a marker (right-click a marker to remove)"
            style={{ height: 24, padding: "0 5px", background: annotateMode ? "var(--surface-2, #f3f4f6)" : undefined, color: annotateMode ? "var(--accent-orange, #f97316)" : undefined }}
          >
            <MapPin size={12} />
          </button>
          <button onClick={() => setView(null)} className="button ghost sm" style={{ height: 24, padding: "0 7px", fontSize: 11, opacity: isZoomed ? 1 : 0.5 }} title="Reset view (double-click chart)">
            <RotateCcw size={11} /> Reset
          </button>
          <button
            onClick={() => {
              const cur = view || dataDomain;
              const midX = (cur.x0 + cur.x1) / 2;
              const midY = (cur.y0 + cur.y1) / 2;
              setView({ x0: midX - (cur.x1 - cur.x0) / 6, x1: midX + (cur.x1 - cur.x0) / 6, y0: midY - (cur.y1 - cur.y0) / 6, y1: midY + (cur.y1 - cur.y0) / 6 });
            }}
            className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Zoom to center"
          >
            <ZoomIn size={12} />
          </button>
          <button onClick={() => svgRef.current && exportSvg(svgRef.current, "png", "spectrum")} className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Export PNG">
            <Download size={12} />
          </button>
          <button onClick={() => svgRef.current && exportSvg(svgRef.current, "svg", "spectrum")} className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Export SVG">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ flex: 1, minHeight: 0 }}>
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          style={{ cursor: drag ? "grabbing" : "crosshair", display: "block", touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setMouse(null); setDrag(null); setBox(null); }}
          onWheel={onWheel}
          onDoubleClick={() => setView(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <clipPath id={clipRef}>
              <rect x={M.left} y={M.top} width={cw} height={ch} />
            </clipPath>
          </defs>
          <rect x={0} y={0} width={dims.w} height={dims.h} fill="var(--surface-1, #fff)" />
          <g clipPath={`url(#${clipRef})`}>
            {xTicks.map((t) => (
              <line key={`gx${t}`} x1={sx(t)} y1={M.top} x2={sx(t)} y2={M.top + ch} stroke="rgba(0,0,0,0.055)" strokeWidth={1} />
            ))}
            {yTicks.map((t) => (
              <line key={`gy${t}`} x1={M.left} y1={sy(t)} x2={M.left + cw} y2={sy(t)} stroke="rgba(0,0,0,0.055)" strokeWidth={1} />
            ))}
          </g>
          <g clipPath={`url(#${clipRef})`}>
            {series.map((s) => (
              <path key={s.key} d={paths[s.key]} fill="none" stroke={s.color} strokeWidth={s.strokeWidth ?? 1.6} strokeDasharray={s.dash} opacity={s.opacity ?? 1} />
            ))}
            {peaks?.map((p, i) => {
              const pkId = `spk-${i}-${p.position.toFixed(3)}`;
              const selected = selectedPeaks.has(pkId);
              const hovered = hoveredPeakId === pkId;
              return (
                <g
                  key={`pk${i}`}
                  onClick={(e) => { e.stopPropagation(); togglePeak(pkId, e.shiftKey || e.ctrlKey || e.metaKey); }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setHoveredPeakId(pkId)}
                  onMouseLeave={() => setHoveredPeakId((h) => (h === pkId ? null : h))}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer" }}
                >
                  <line x1={sx(p.position)} y1={M.top} x2={sx(p.position)} y2={M.top + ch} stroke="#f43f5e" strokeWidth={selected ? 1.8 : hovered ? 1.2 : 0.7} strokeDasharray={selected ? undefined : "3 3"} opacity={selected ? 0.95 : hovered ? 0.85 : 0.5} style={{ transition: "opacity 0.2s ease, stroke-width 0.2s ease" }} />
                  <line x1={sx(p.position) - 4} y1={sy(p.intensity + Math.max(1, p.intensity * 0.05))} x2={sx(p.position) + 4} y2={sy(p.intensity + Math.max(1, p.intensity * 0.05))} stroke="#f43f5e" strokeWidth={selected ? 2 : 1.2} />
                  <line x1={sx(p.position)} y1={M.top} x2={sx(p.position)} y2={M.top + ch} stroke="transparent" strokeWidth={10} style={{ pointerEvents: "stroke", cursor: "pointer" }} />
                  {selected && (
                    <circle cx={sx(p.position)} cy={M.top + 8} r={3} fill="#f43f5e" stroke="#fff" strokeWidth={1}>
                      <animate attributeName="r" values="2.5;4.5;2.5" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>

          <g clipPath={`url(#${clipRef})`}>
            {box && Math.abs(box.x2 - box.x1) > 1 && Math.abs(box.y2 - box.y1) > 1 && (
              <rect
                x={Math.min(box.x1, box.x2)}
                y={Math.min(box.y1, box.y2)}
                width={Math.abs(box.x2 - box.x1)}
                height={Math.abs(box.y2 - box.y1)}
                fill="rgba(249,115,22,0.12)"
                stroke="rgba(249,115,22,0.7)"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
          </g>

          <g clipPath={`url(#${clipRef})`}>
            {annotations.map((a) => (
              <g
                key={a.id}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); removeAnnotation(a.id); }}
                style={{ cursor: "pointer" }}
              >
                <circle cx={sx(a.x)} cy={sy(a.y)} r={3} fill={a.color || "#f59e0b"} stroke="#fff" strokeWidth={1} />
                <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(a.x) + 5} y2={sy(a.y) - 10} stroke="#f59e0b" strokeWidth={0.8} />
                <text x={sx(a.x) + 7} y={sy(a.y) - 10} fontSize={9} fill={a.color || "#b45309"} fontFamily="system-ui, sans-serif">
                  {a.label}
                </text>
              </g>
            ))}
          </g>
          <line x1={M.left} y1={M.top} x2={M.left + cw} y2={M.top} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          <line x1={M.left} y1={M.top + ch} x2={M.left + cw} y2={M.top + ch} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + ch} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          <line x1={M.left + cw} y1={M.top} x2={M.left + cw} y2={M.top + ch} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          {xTicks.map((t) => (
            <g key={`xt${t}`}>
              <line x1={sx(t)} y1={M.top + ch} x2={sx(t)} y2={M.top + ch + 4} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
              <text x={sx(t)} y={M.top + ch + 16} textAnchor="middle" fontSize={10} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">{fmtTick(t)}</text>
            </g>
          ))}
          <text x={M.left + cw / 2} y={dims.h - 6} textAnchor="middle" fontSize={11} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">{xAxisLabel}</text>
          {yTicks.map((t) => (
            <g key={`yt${t}`}>
              <line x1={M.left - 4} y1={sy(t)} x2={M.left} y2={sy(t)} stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
              <text x={M.left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">{fmtTick(t)}</text>
            </g>
          ))}
          <text x={14} y={M.top + ch / 2} textAnchor="middle" fontSize={11} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif" transform={`rotate(-90, 14, ${M.top + ch / 2})`}>{yAxisLabel}</text>

          {cursor.inside && (
            <g style={{ pointerEvents: "none" }}>
              <line x1={mouse!.sx} y1={M.top} x2={mouse!.sx} y2={M.top + ch} stroke="rgba(0,0,0,0.22)" strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={M.left} y1={mouse!.sy} x2={M.left + cw} y2={mouse!.sy} stroke="rgba(0,0,0,0.22)" strokeWidth={0.8} strokeDasharray="3 3" />
              {cursor.idx >= 0 && (
                <circle cx={sx(cursor.x)} cy={sy(cursor.value)} r={3.5} fill={primary.color} stroke="#fff" strokeWidth={1.5}>
                  <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
              {nearestPeak && (
                <line x1={sx(nearestPeak.position)} y1={M.top} x2={sx(nearestPeak.position)} y2={M.top + ch} stroke="#f43f5e" strokeWidth={0.7} strokeDasharray="2 2" opacity={0.5} />
              )}
              <rect x={M.left + cw - 176} y={M.top + 6} width={168} height={nearestPeak ? 58 : 40} rx={4} fill="var(--bg-elevated, #fff)" stroke="var(--border-default, #ddd)" strokeWidth={0.8} opacity={0.95} />
              <text x={M.left + cw - 168} y={M.top + 21} fontSize={10} fill="var(--text-secondary, #555)" fontFamily="system-ui, sans-serif">
                {xAxisLabel.split(" (")[0]} = {cursor.x.toFixed(2)}
              </text>
              <text x={M.left + cw - 168} y={M.top + 36} fontSize={10} fill="var(--text-secondary, #555)" fontFamily="system-ui, sans-serif">
                y = {cursor.value.toFixed(4)}
              </text>
              {nearestPeak && (
                <>
                  <line x1={M.left + cw - 168} y1={M.top + 42} x2={M.left + cw - 16} y2={M.top + 42} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
                  <text x={M.left + cw - 168} y={M.top + 55} fontSize={9} fill="#f43f5e" fontFamily="system-ui, sans-serif" fontWeight={500}>
                    Peak {nearestPeak.position.toFixed(2)} · I {nearestPeak.intensity.toFixed(0)}{nearestPeak.assignment ? ` · ${nearestPeak.assignment}` : ""}
                  </text>
                </>
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
