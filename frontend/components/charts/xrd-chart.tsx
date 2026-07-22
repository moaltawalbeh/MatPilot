"use client";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { FileBarChart, RotateCcw, ZoomIn, Download, Maximize2 } from "lucide-react";

type DataPoint = {
  angle: number;
  Experimental?: number;
  Theoretical?: number;
  Calculated?: number;
  Difference?: number;
  Background?: number;
};

type Peak = { two_theta: number; intensity: number };
type TheoreticalPeak = { two_theta: number; intensity: number; hkl?: string; color?: string; phaseName?: string };

type XrdChartProps = {
  data?: DataPoint[];
  peaks?: Peak[];
  theoreticalPeaks?: TheoreticalPeak[];
  referenceLines?: { angle: number; label: string; color?: string }[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

const M = { top: 24, right: 24, bottom: 48, left: 70 };
const C = {
  experimental: "#f97316",
  calculated: "#10b981",
  difference: "#94a3b8",
  background: "#8b5cf6",
  peak: "#f43f5e",
  theoretical: "#eab308",
  grid: "rgba(0,0,0,0.055)",
  axis: "rgba(0,0,0,0.18)",
  crosshair: "rgba(0,0,0,0.25)",
  selectionFill: "rgba(249,115,22,0.12)",
  selectionStroke: "rgba(249,115,22,0.7)",
};

function niceNum(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range));
  const frac = range / Math.pow(10, exp);
  let nice: number;
  if (round) {
    nice = frac < 1.5 ? 1 : frac < 3 ? 2 : frac < 7 ? 5 : 10;
  } else {
    nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  }
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
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 10000) return v.toFixed(0);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

function buildPath(
  data: DataPoint[],
  key: keyof DataPoint,
  sx: (v: number) => number,
  sy: (v: number) => number,
): string {
  const parts: string[] = [];
  let active = false;
  for (let i = 0; i < data.length; i++) {
    const yv = data[i][key];
    if (yv == null || !isFinite(yv)) {
      active = false;
      continue;
    }
    const x = sx(data[i].angle);
    const y = sy(yv);
    if (!active) {
      parts.push(`M${x.toFixed(1)},${y.toFixed(1)}`);
      active = true;
    } else {
      parts.push(`L${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }
  return parts.join("");
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

function exportSvg(svgEl: SVGSVGElement, fmt: "png" | "svg") {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  if (fmt === "svg") {
    downloadBlob(new Blob([data], { type: "image/svg+xml;charset=utf-8" }), "xrd-pattern.svg");
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
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob((b) => {
      if (b) downloadBlob(b, "xrd-pattern.png");
    }, "image/png");
  };
  img.src = URL.createObjectURL(new Blob([data], { type: "image/svg+xml;charset=utf-8" }));
}

export function XrdChart({
  data,
  peaks,
  theoreticalPeaks,
  referenceLines,
  title,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: XrdChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const [view, setView] = useState<{ x0: number; x1: number; y0: number; y1: number } | null>(null);
  const [drag, setDrag] = useState<{
    kind: "pan" | "box";
    sx: number;
    sy: number;
    vx0: number;
    vy0: number;
    vx1: number;
    vy1: number;
  } | null>(null);
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ sx: number; sy: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

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

  const cw = dims.w - M.left - M.right;
  const ch = dims.h - M.top - M.bottom;

  const dataDomain = useMemo(() => {
    if (!data || data.length === 0) return { x0: 0, x1: 100, y0: 0, y1: 100 };
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const d of data) {
      if (d.angle < xMin) xMin = d.angle;
      if (d.angle > xMax) xMax = d.angle;
      const yv = d.Experimental;
      if (yv != null && isFinite(yv)) {
        if (yv < yMin) yMin = yv;
        if (yv > yMax) yMax = yv;
      }
    }
    if (!isFinite(yMin)) { yMin = 0; yMax = 100; }
    yMin = Math.min(0, yMin);
    const xPad = (xMax - xMin) * 0.01 || 1;
    const yPad = (yMax - yMin) * 0.05 || 1;
    return { x0: xMin - xPad, x1: xMax + xPad, y0: Math.max(0, yMin - yPad), y1: yMax + yPad };
  }, [data]);

  const domain = view || dataDomain;

  const sx = useCallback(
    (v: number) => M.left + ((v - domain.x0) / (domain.x1 - domain.x0)) * cw,
    [domain.x0, domain.x1, cw],
  );
  const sy = useCallback(
    (v: number) => M.top + ch - ((v - domain.y0) / (domain.y1 - domain.y0)) * ch,
    [domain.y0, domain.y1, ch],
  );
  const invX = useCallback(
    (px: number) => domain.x0 + ((px - M.left) / cw) * (domain.x1 - domain.x0),
    [domain.x0, domain.x1, cw],
  );
  const invY = useCallback(
    (py: number) => domain.y0 + ((M.top + ch - py) / ch) * (domain.y1 - domain.y0),
    [domain.y0, domain.y1, ch],
  );

  const xTicks = useMemo(() => makeTicks(domain.x0, domain.x1, Math.max(4, Math.floor(cw / 80))), [domain.x0, domain.x1, cw]);
  const yTicks = useMemo(() => makeTicks(domain.y0, domain.y1, Math.max(3, Math.floor(ch / 60))), [domain.y0, domain.y1, ch]);

  const paths = useMemo(() => {
    if (!data || data.length === 0) return {} as Record<string, string>;
    const r: Record<string, string> = {};
    r.Experimental = buildPath(data, "Experimental", sx, sy);
    if (data[0]?.Calculated !== undefined) r.Calculated = buildPath(data, "Calculated", sx, sy);
    if (data[0]?.Difference !== undefined) r.Difference = buildPath(data, "Difference", sx, sy);
    if (data[0]?.Background !== undefined) r.Background = buildPath(data, "Background", sx, sy);
    return r;
  }, [data, sx, sy]);

  const svgToClient = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { cx: number; cy: number } => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { cx: 0, cy: 0 };
      let clientX: number, clientY: number;
      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { cx: clientX - rect.left, cy: clientY - rect.top };
    },
    [],
  );

  const clampXY = useCallback(
    (cx: number, cy: number) => ({
      cx: Math.max(M.left, Math.min(M.left + cw, cx)),
      cy: Math.max(M.top, Math.min(M.top + ch, cy)),
    }),
    [cw, ch],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!data || data.length === 0) return;
      const raw = svgToClient(e);
      const { cx, cy } = clampXY(raw.cx, raw.cy);
      const isBox = e.shiftKey;
      if (isBox) {
        e.preventDefault();
        setDrag({ kind: "box", sx: cx, sy: cy, vx0: domain.x0, vy0: domain.y0, vx1: domain.x1, vy1: domain.y1 });
        setBox({ x1: cx, y1: cy, x2: cx, y2: cy });
      } else {
        e.preventDefault();
        setDrag({ kind: "pan", sx: cx, sy: cy, vx0: domain.x0, vy0: domain.y0, vx1: domain.x1, vy1: domain.y1 });
        setIsPanning(true);
      }
    },
    [data, domain, svgToClient, clampXY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const raw = svgToClient(e);
      const { cx, cy } = clampXY(raw.cx, raw.cy);
      setMousePos({ sx: cx, sy: cy });
      if (!drag) return;
      if (drag.kind === "box") {
        setBox({ x1: drag.sx, y1: drag.sy, x2: cx, y2: cy });
      } else if (drag.kind === "pan") {
        const dxData = -((cx - drag.sx) / cw) * (drag.vx1 - drag.vx0);
        const dyData = ((cy - drag.sy) / ch) * (drag.vy1 - drag.vy0);
        setView({ x0: drag.vx0 + dxData, x1: drag.vx1 + dxData, y0: drag.vy0 + dyData, y1: drag.vy1 + dyData });
      }
    },
    [drag, svgToClient, clampXY, cw, ch],
  );

  const handleMouseUp = useCallback(() => {
    if (!drag) return;
    if (drag.kind === "box" && box) {
      const bx0 = Math.min(box.x1, box.x2);
      const bx1 = Math.max(box.x1, box.x2);
      const by0 = Math.min(box.y1, box.y2);
      const by1 = Math.max(box.y1, box.y2);
      const minSpanX = (drag.vx1 - drag.vx0) * 0.01;
      const minSpanY = (drag.vy1 - drag.vy0) * 0.01;
      const newW = Math.abs(invX(bx1) - invX(bx0));
      const newH = Math.abs(invY(by0) - invY(by1));
      if (newW > minSpanX && newH > minSpanY) {
        const nx0 = Math.min(invX(bx0), invX(bx1));
        const nx1 = Math.max(invX(bx0), invX(bx1));
        const ny0 = Math.min(invY(by0), invY(by1));
        const ny1 = Math.max(invY(by0), invY(by1));
        setView({ x0: nx0, x1: nx1, y0: ny0, y1: ny1 });
      }
    }
    setDrag(null);
    setBox(null);
    setIsPanning(false);
  }, [drag, box, invX, invY]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!data || data.length === 0) return;
      e.preventDefault();
      const raw = svgToClient(e);
      const { cx, cy } = clampXY(raw.cx, raw.cy);
      const dataX = invX(cx);
      const dataY = invY(cy);
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      const curW = domain.x1 - domain.x0;
      const curH = domain.y1 - domain.y0;
      const ratioX = (dataX - domain.x0) / curW;
      const ratioY = (dataY - domain.y0) / curH;
      const newW = curW * factor;
      const newH = curH * factor;
      const minW = (dataDomain.x1 - dataDomain.x0) * 0.002;
      const minH = (dataDomain.y1 - dataDomain.y0) * 0.002;
      const maxW = (dataDomain.x1 - dataDomain.x0) * 5;
      const maxH = (dataDomain.y1 - dataDomain.y0) * 5;
      const fw = Math.max(minW, Math.min(maxW, newW));
      const fh = Math.max(minH, Math.min(maxH, newH));
      setView({
        x0: dataX - ratioX * fw,
        x1: dataX + (1 - ratioX) * fw,
        y0: dataY - ratioY * fh,
        y1: dataY + (1 - ratioY) * fh,
      });
    },
    [data, domain, dataDomain, svgToClient, clampXY, invX, invY],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!data || data.length === 0) return;
      if (e.touches.length === 1) {
        const raw = svgToClient(e);
        const { cx, cy } = clampXY(raw.cx, raw.cy);
        e.preventDefault();
        setDrag({ kind: "pan", sx: cx, sy: cy, vx0: domain.x0, vy0: domain.y0, vx1: domain.x1, vy1: domain.y1 });
        setIsPanning(true);
      }
    },
    [data, domain, svgToClient, clampXY],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!drag || drag.kind !== "pan") return;
      e.preventDefault();
      const raw = svgToClient(e);
      const { cx, cy } = clampXY(raw.cx, raw.cy);
      const dxData = -((cx - drag.sx) / cw) * (drag.vx1 - drag.vx0);
      const dyData = ((cy - drag.sy) / ch) * (drag.vy1 - drag.vy0);
      setView({ x0: drag.vx0 + dxData, x1: drag.vx1 + dxData, y0: drag.vy0 + dyData, y1: drag.vy1 + dyData });
    },
    [drag, svgToClient, clampXY, cw, ch],
  );

  const handleTouchEnd = useCallback(() => {
    setDrag(null);
    setBox(null);
    setIsPanning(false);
  }, []);

  const handleDblClick = useCallback(() => {
    setView(null);
    setDrag(null);
    setBox(null);
  }, []);

  const handleReset = useCallback(() => {
    setView(null);
    setDrag(null);
    setBox(null);
  }, []);

  const handleCenterZoom = useCallback(() => {
    const midX = (domain.x0 + domain.x1) / 2;
    const midY = (domain.y0 + domain.y1) / 2;
    const hw = (domain.x1 - domain.x0) / 6;
    const hh = (domain.y1 - domain.y0) / 6;
    setView({ x0: midX - hw, x1: midX + hw, y0: midY - hh, y1: midY + hh });
  }, [domain]);

  const isZoomed = view !== null;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => {
      if (svgRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", preventScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventScroll);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className="chart"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          minHeight: 250,
        }}
      >
        <FileBarChart size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.5 }} />
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
          {emptyTitle || "No diffraction data yet"}
        </h3>
        <p style={{ fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 16, color: "var(--text-tertiary)" }}>
          {emptyDescription || "Upload an XRD pattern to visualize the diffraction data."}
        </p>
        {emptyAction}
      </div>
    );
  }

  const hasCalculated = data[0]?.Calculated !== undefined;
  const hasDifference = data[0]?.Difference !== undefined;
  const hasBackground = data[0]?.Background !== undefined;

  let cursorDataX = 0, cursorDataY = 0, nearestY = 0, nearestIdx = -1, hasCursor = false;
  if (mousePos) {
    cursorDataX = invX(mousePos.sx);
    cursorDataY = invY(mousePos.sy);
    hasCursor = mousePos.sx >= M.left && mousePos.sx <= M.left + cw && mousePos.sy >= M.top && mousePos.sy <= M.top + ch;
    if (hasCursor && data.length > 0) {
      let lo = 0, hi = data.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (data[mid].angle < cursorDataX) lo = mid + 1;
        else hi = mid;
      }
      if (lo > 0 && Math.abs(data[lo - 1].angle - cursorDataX) < Math.abs(data[lo].angle - cursorDataX)) lo--;
      nearestIdx = lo;
      nearestY = data[lo].Experimental ?? 0;
    }
  }

  let nearestPeak: TheoreticalPeak | null = null;
  if (hasCursor && theoreticalPeaks && theoreticalPeaks.length > 0) {
    let minDist = Infinity;
    for (const tp of theoreticalPeaks) {
      const dist = Math.abs(tp.two_theta - cursorDataX);
      if (dist < minDist) {
        minDist = dist;
        nearestPeak = tp;
      }
    }
    if (minDist > 2) nearestPeak = null;
  }

  const selRect = box
    ? {
        x: Math.min(box.x1, box.x2),
        y: Math.min(box.y1, box.y2),
        w: Math.abs(box.x2 - box.x1),
        h: Math.abs(box.y2 - box.y1),
      }
    : null;

  const cursorSvg = drag?.kind === "box" ? null : mousePos;

  return (
    <div className="chart" style={{ position: "relative", userSelect: drag ? "none" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px 0", flexShrink: 0 }}>
        {title && (
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {title}
          </div>
        )}
        <div style={{ display: "flex", gap: 2, marginLeft: "auto", alignItems: "center" }}>
          {isZoomed && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 6, background: "var(--surface-2)", padding: "2px 7px", borderRadius: 4 }}>
              {domain.x0.toFixed(1)}°–{domain.x1.toFixed(1)}°
            </span>
          )}
          <button
            onClick={handleReset}
            className="button ghost sm"
            style={{ height: 24, padding: "0 7px", fontSize: 11, opacity: isZoomed ? 1 : 0.5 }}
            title="Reset view (double-click chart)"
          >
            <RotateCcw size={11} /> Reset
          </button>
          <button onClick={handleCenterZoom} className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Zoom to center">
            <ZoomIn size={12} />
          </button>
          <button onClick={() => exportSvg(svgRef.current!, "png")} className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Export PNG">
            <Download size={12} />
          </button>
          <button onClick={() => exportSvg(svgRef.current!, "svg")} className="button ghost sm" style={{ height: 24, padding: "0 5px" }} title="Export SVG">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} style={{ flex: 1, minHeight: 0 }}>
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          style={{
            cursor: isPanning ? "grabbing" : "crosshair",
            display: "block",
            touchAction: "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setMousePos(null); if (drag?.kind === "pan") { setDrag(null); setBox(null); setIsPanning(false); } }}
          onWheel={handleWheel}
          onDoubleClick={handleDblClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <defs>
            <clipPath id="xrd-clip">
              <rect x={M.left} y={M.top} width={cw} height={ch} />
            </clipPath>
          </defs>

          <rect x={0} y={0} width={dims.w} height={dims.h} fill="var(--surface-1, #fff)" />

          <g clipPath="url(#xrd-clip)">
            {xTicks.map((t) => (
              <line key={`gv${t}`} x1={sx(t)} y1={M.top} x2={sx(t)} y2={M.top + ch} stroke={C.grid} strokeWidth={1} />
            ))}
            {yTicks.map((t) => (
              <line key={`gh${t}`} x1={M.left} y1={sy(t)} x2={M.left + cw} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
            ))}
          </g>

          <g clipPath="url(#xrd-clip)">
            {paths.Background && <path d={paths.Background} fill="none" stroke={C.background} strokeWidth={1} opacity={0.45} strokeDasharray="5 3" />}
            {paths.Difference && <path d={paths.Difference} fill="none" stroke={C.difference} strokeWidth={1} opacity={0.55} />}
            {paths.Calculated && <path d={paths.Calculated} fill="none" stroke={C.calculated} strokeWidth={1.5} opacity={0.85} />}
            {paths.Experimental && <path d={paths.Experimental} fill="none" stroke={C.experimental} strokeWidth={1.8} />}
          </g>

          <g clipPath="url(#xrd-clip)">
            {peaks?.map((p, i) => (
              <line key={`pk${i}`} x1={sx(p.two_theta)} y1={M.top} x2={sx(p.two_theta)} y2={M.top + ch} stroke={C.peak} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.55} />
            ))}
            {theoreticalPeaks?.map((tp, i) => {
              const tpColor = tp.color || C.theoretical;
              return (
                <g key={`th${i}`}>
                  <line x1={sx(tp.two_theta)} y1={M.top} x2={sx(tp.two_theta)} y2={M.top + ch} stroke={tpColor} strokeWidth={1} strokeDasharray="4 2" opacity={0.7} />
                  {tp.hkl && (
                    <text x={sx(tp.two_theta)} y={M.top + 10 + (i % 3) * 11} textAnchor="middle" fontSize={8} fill={tpColor} fontWeight={500}>
                      {tp.hkl}
                    </text>
                  )}
                </g>
              );
            })}
            {referenceLines?.map((r, i) => (
              <g key={`rf${i}`}>
                <line x1={sx(r.angle)} y1={M.top} x2={sx(r.angle)} y2={M.top + ch} stroke={r.color || C.theoretical} strokeWidth={0.8} strokeDasharray="5 3" opacity={0.6} />
                {r.label && (
                  <text x={sx(r.angle)} y={M.top + 10} textAnchor="middle" fontSize={8} fill={r.color || C.theoretical} fontWeight={500}>
                    {r.label}
                  </text>
                )}
              </g>
            ))}
          </g>

          <g clipPath="url(#xrd-clip)">
            {selRect && selRect.w > 1 && selRect.h > 1 && (
              <>
                <rect x={selRect.x} y={selRect.y} width={selRect.w} height={selRect.h} fill={C.selectionFill} stroke={C.selectionStroke} strokeWidth={1} strokeDasharray="4 2" />
              </>
            )}
          </g>

          <line x1={M.left} y1={M.top} x2={M.left + cw} y2={M.top} stroke={C.axis} strokeWidth={1} />
          <line x1={M.left} y1={M.top + ch} x2={M.left + cw} y2={M.top + ch} stroke={C.axis} strokeWidth={1} />
          <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + ch} stroke={C.axis} strokeWidth={1} />
          <line x1={M.left + cw} y1={M.top} x2={M.left + cw} y2={M.top + ch} stroke={C.axis} strokeWidth={1} />

          {xTicks.map((t) => (
            <g key={`xt${t}`}>
              <line x1={sx(t)} y1={M.top + ch} x2={sx(t)} y2={M.top + ch + 4} stroke={C.axis} strokeWidth={1} />
              <text x={sx(t)} y={M.top + ch + 16} textAnchor="middle" fontSize={10} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          <text x={M.left + cw / 2} y={dims.h - 6} textAnchor="middle" fontSize={11} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">
            2θ (degrees)
          </text>

          {yTicks.map((t) => (
            <g key={`yt${t}`}>
              <line x1={M.left - 4} y1={sy(t)} x2={M.left} y2={sy(t)} stroke={C.axis} strokeWidth={1} />
              <text x={M.left - 8} y={sy(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted, #666)" fontFamily="system-ui, sans-serif">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          <text
            x={16}
            y={M.top + ch / 2}
            textAnchor="middle"
            fontSize={11}
            fill="var(--text-muted, #666)"
            fontFamily="system-ui, sans-serif"
            transform={`rotate(-90, 16, ${M.top + ch / 2})`}
          >
            Intensity (counts)
          </text>

          {cursorSvg && hasCursor && (
            <g clipPath="url(#xrd-clip)" style={{ pointerEvents: "none" }}>
              <line x1={cursorSvg.sx} y1={M.top} x2={cursorSvg.sx} y2={M.top + ch} stroke={C.crosshair} strokeWidth={0.8} strokeDasharray="3 3" />
              <line x1={M.left} y1={cursorSvg.sy} x2={M.left + cw} y2={cursorSvg.sy} stroke={C.crosshair} strokeWidth={0.8} strokeDasharray="3 3" />
              {nearestIdx >= 0 && (
                <circle cx={sx(cursorDataX)} cy={sy(nearestY)} r={3.5} fill={C.experimental} stroke="#fff" strokeWidth={1.5} />
              )}
            </g>
          )}

          {cursorSvg && hasCursor && (
            <g style={{ pointerEvents: "none" }}>
              <rect x={M.left + cw - 185} y={M.top + 6} width={178} height={nearestPeak ? 68 : 38} rx={4} fill="var(--bg-elevated, #fff)" stroke="var(--border-default, #ddd)" strokeWidth={0.8} opacity={0.94} />
              <text x={M.left + cw - 177} y={M.top + 21} fontSize={10} fill="var(--text-secondary, #555)" fontFamily="system-ui, sans-serif">
                2θ = {cursorDataX.toFixed(3)}°
              </text>
              <text x={M.left + cw - 177} y={M.top + 36} fontSize={10} fill="var(--text-secondary, #555)" fontFamily="system-ui, sans-serif">
                I = {nearestY != null ? nearestY.toFixed(0) : "—"}
              </text>
              {nearestPeak && (
                <>
                  <text x={M.left + cw - 177} y={M.top + 50} fontSize={9} fill={nearestPeak.color || C.theoretical} fontFamily="system-ui, sans-serif" fontWeight={500}>
                    Peak: {nearestPeak.hkl || nearestPeak.two_theta.toFixed(2) + "°"}
                  </text>
                  <text x={M.left + cw - 177} y={M.top + 64} fontSize={9} fill={nearestPeak.color || C.theoretical} fontFamily="system-ui, sans-serif" fontWeight={500}>
                    Phase: {nearestPeak.phaseName || "Reference"}
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
