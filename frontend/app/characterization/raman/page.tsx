"use client";

import { useState, useEffect, useMemo } from "react";
import { Page } from "@/components/ui/page";
import {
  Waves,
  Play,
  RotateCcw,
  Download,
  FileText,
  Search,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// ── Built-in Standard Raman Datasets ──────────────────────────────────────
const RAMAN_PRESETS: Record<
  string,
  { label: string; description: string; shifts: number[]; intensities: number[] }
> = {
  graphene: {
    label: "Graphene / Graphitic Carbon Film",
    description: "Exhibits D band (1350 cm⁻¹ disorder), G band (1580 cm⁻¹ sp² carbon), and 2D overtone (2700 cm⁻¹)",
    shifts: [
      200, 400, 600, 800, 1000, 1200, 1350, 1450, 1580, 1750, 2000, 2400, 2700, 3000,
    ],
    intensities: [
      12, 10, 11, 14, 15, 22, 65, 28, 100, 25, 18, 20, 85, 15,
    ],
  },
  silicon: {
    label: "Crystalline Silicon Reference (c-Si)",
    description: "Standard Raman calibration crystal with strong first-order optical phonon peak at 520.6 cm⁻¹",
    shifts: [
      150, 250, 350, 450, 520, 600, 750, 950, 1100, 1350,
    ],
    intensities: [
      5, 7, 8, 12, 100, 10, 8, 6, 5, 4,
    ],
  },
  tio2: {
    label: "Anatase TiO₂ Thin Film",
    description: "Displays diagnostic Raman active lattice phonon modes at 144 (Eg), 399 (B1g), 519 (A1g), and 639 (Eg) cm⁻¹",
    shifts: [
      100, 144, 250, 399, 450, 519, 580, 639, 750, 900,
    ],
    intensities: [
      15, 100, 20, 45, 18, 60, 22, 50, 12, 10,
    ],
  },
};

type RamanPeak = {
  shift: number;
  intensity: number;
  prominence: number;
  fwhm: number;
  assigned_mode: string;
  description: string;
  expected_range: string;
};

type RamanResult = {
  raman_shifts: number[];
  intensities: number[];
  baseline: number[];
  peaks: RamanPeak[];
  ratios: {
    ID_IG?: {
      D_intensity: number;
      G_intensity: number;
      ratio_value: number;
      quality_assessment: string;
    };
  };
  statistics: {
    min_shift: number;
    max_shift: number;
    data_points: number;
    total_peaks_detected: number;
    modes_identified: number;
    baseline_method: string;
    normalize_method: string;
  };
};

export default function RamanCharacterizationPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>("graphene");
  const [baselineMethod, setBaselineMethod] = useState<string>("none");
  const [polyOrder, setPolyOrder] = useState<number>(2);
  const [normalizeMethod, setNormalizeMethod] = useState<string>("max100");
  const [minProminence, setMinProminence] = useState<number>(10.0);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RamanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"peaks" | "defect" | "library">("peaks");
  const [library, setLibrary] = useState<any[]>([]);
  const [libSearch, setLibSearch] = useState<string>("");

  // Load reference phonon library on mount
  useEffect(() => {
    fetch("/api/v1/raman/library")
      .then((r) => r.json())
      .then((d) => {
        if (d.modes) setLibrary(d.modes);
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const preset = RAMAN_PRESETS[selectedPreset];
      const resp = await fetch("/api/v1/raman/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raman_shifts: preset.shifts,
          intensities: preset.intensities,
          baseline_method: baselineMethod,
          poly_order: polyOrder,
          normalize_method: normalizeMethod,
          min_peak_prominence: minProminence,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.detail || "Failed to analyze Raman spectrum");
      }
      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during Raman processing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  // Formatted data for Recharts (Raman shift from low to high cm^-1)
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.raman_shifts.map((s, i) => ({
      shift: s,
      Intensity: result.intensities[i],
      Baseline: result.baseline[i],
    }));
  }, [result]);

  const filteredLibrary = useMemo(() => {
    if (!libSearch) return library;
    const q = libSearch.toLowerCase();
    return library.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.material.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [library, libSearch]);

  return (
    <Page
      eyebrow="Scientific Module — Spectroscopy"
      title="Raman Spectroscopy & Phonon Mode Analysis"
      description="Interactive Raman scattering characterization, phonon mode identification, and graphitic carbon ID/IG defect density analysis."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Controls & Sample Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Waves className="h-5 w-5" />
                <span>Sample & Parameters</span>
              </div>
              <span className="text-xs bg-cyan-500/10 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-medium">
                ASTM E1840
              </span>
            </div>

            {/* Preset Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Reference Calibration Sample
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {Object.entries(RAMAN_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {RAMAN_PRESETS[selectedPreset]?.description}
              </p>
            </div>

            {/* Baseline Method */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Baseline Method
                </label>
                <select
                  value={baselineMethod}
                  onChange={(e) => setBaselineMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="none">None (Raw)</option>
                  <option value="linear">Linear Endpoint</option>
                  <option value="poly">Polynomial Fit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Normalization
                </label>
                <select
                  value={normalizeMethod}
                  onChange={(e) => setNormalizeMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="max100">Max = 100%</option>
                  <option value="minmax">Min-Max (0–1)</option>
                  <option value="none">Raw Intensity</option>
                </select>
              </div>
            </div>

            {/* Poly Order */}
            {baselineMethod === "poly" && (
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Polynomial Order</span>
                  <span className="font-mono text-cyan-400">{polyOrder}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={polyOrder}
                  onChange={(e) => setPolyOrder(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            )}

            {/* Prominence Threshold */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Min Peak Prominence</span>
                <span className="font-mono text-cyan-400">{minProminence.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="30.0"
                step="1.0"
                value={minProminence}
                onChange={(e) => setMinProminence(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{loading ? "Processing..." : "Analyze Spectrum"}</span>
              </button>
              <button
                onClick={() => {
                  setBaselineMethod("none");
                  setNormalizeMethod("max100");
                  setMinProminence(10.0);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
                title="Reset Parameters"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Statistics Banner */}
          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Phonon &amp; Defect Diagnostics</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Peaks Detected</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {result.statistics.total_peaks_detected}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">ID / IG Ratio</div>
                  <div className="text-xl font-bold text-cyan-400 mt-0.5">
                    {result.ratios.ID_IG
                      ? result.ratios.ID_IG.ratio_value.toFixed(2)
                      : "N/A"}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Raman Range</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1">
                    {result.statistics.min_shift}–{result.statistics.max_shift} cm⁻¹
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Quality Assessment</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1 truncate">
                    {result.ratios.ID_IG?.quality_assessment || "Standard"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Spectrum Chart & Results Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Chart Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Raman Scattering Spectrum</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-normal">
                    {RAMAN_PRESETS[selectedPreset]?.label}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Stokes Raman shift displayed in cm⁻¹ against normalized scattering intensity
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="shift"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      stroke="#64748b"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Raman Shift (cm⁻¹)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Scattering Intensity (%)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090d16",
                        borderColor: "#1e293b",
                        borderRadius: "0.75rem",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{ color: "#22d3ee", fontWeight: 600 }}
                      formatter={(val: any) => [`${Number(val).toFixed(2)}`, ""]}
                      labelFormatter={(label: any) => `Raman Shift: ${label} cm⁻¹`}
                    />
                    <Line
                      type="monotone"
                      dataKey="Intensity"
                      name="Intensity"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, fill: "#67e8f9", stroke: "#fff", strokeWidth: 2 }}
                    />
                    {baselineMethod !== "none" && (
                      <Line
                        type="monotone"
                        dataKey="Baseline"
                        name="Baseline"
                        stroke="#475569"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Click &ldquo;Analyze Spectrum&rdquo; to process Raman data
                </div>
              )}
            </div>
          </div>

          {/* Results Navigation Tabs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-3">
              <button
                onClick={() => setActiveTab("peaks")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "peaks"
                    ? "border-cyan-500 text-cyan-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Phonon Modes &amp; Peaks ({result?.peaks.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("defect")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "defect"
                    ? "border-cyan-500 text-cyan-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>ID/IG Graphitic Defect Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "library"
                    ? "border-cyan-500 text-cyan-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Raman Phonon Reference Library ({library.length})</span>
              </button>
            </div>

            <div className="p-5">
              {/* TAB 1: PEAKS TABLE */}
              {activeTab === "peaks" && (
                <div className="overflow-x-auto">
                  {result && result.peaks.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Raman Shift (cm⁻¹)</th>
                          <th className="py-3 px-3">Intensity</th>
                          <th className="py-3 px-3">FWHM (cm⁻¹)</th>
                          <th className="py-3 px-3">Assigned Mode</th>
                          <th className="py-3 px-3">Standard Band Range</th>
                          <th className="py-3 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {result.peaks.map((peak, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                              {peak.shift.toFixed(1)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {peak.intensity.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {peak.fwhm ? peak.fwhm.toFixed(1) : "—"}
                            </td>
                            <td className="py-3 px-3 font-medium text-white">
                              {peak.assigned_mode}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-400">
                              {peak.expected_range}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-400 max-w-xs">
                              {peak.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      No peaks detected matching prominence threshold ({minProminence.toFixed(1)}).
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DEFECT ANALYSIS */}
              {activeTab === "defect" && result && (
                <div className="space-y-4 text-slate-300 text-sm">
                  {result.ratios.ID_IG ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          D-Band Intensity (ID)
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">
                          {result.ratios.ID_IG.D_intensity.toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          sp³ defect-induced breathing mode ~1350 cm⁻¹
                        </p>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                          G-Band Intensity (IG)
                        </div>
                        <div className="text-2xl font-bold text-white mt-1">
                          {result.ratios.ID_IG.G_intensity.toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          In-plane sp² carbon stretch ~1580 cm⁻¹
                        </p>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                        <div className="text-xs text-cyan-300 uppercase tracking-wider font-semibold">
                          ID / IG Defect Ratio
                        </div>
                        <div className="text-3xl font-bold text-cyan-400 mt-1">
                          {result.ratios.ID_IG.ratio_value.toFixed(2)}
                        </div>
                        <p className="text-xs text-cyan-200 mt-1">
                          {result.ratios.ID_IG.quality_assessment}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      ID/IG defect ratio requires both D band (1350 cm⁻¹) and G band (1580 cm⁻¹) peaks to be detected in the spectrum.
                    </div>
                  )}

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                    <p className="font-semibold text-slate-200 mb-1">
                      Tuinstra-Koenig &amp; Ferrari Structural Disorder Protocol:
                    </p>
                    The ratio of the disorder-induced D band to the first-order graphitic G band intensity (ID/IG) is inversely proportional to the average in-plane crystallite size (La) of graphitic materials and carbon nanotubes. A ratio below 0.3 indicates pristine crystallinity, while values &gt; 1.0 denote high defect density or amorphization.
                  </div>
                </div>
              )}

              {/* TAB 3: REFERENCE LIBRARY */}
              {activeTab === "library" && (
                <div className="space-y-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter phonon modes or material..."
                      value={libSearch}
                      onChange={(e) => setLibSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredLibrary.map((m, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-white text-sm">{m.name}</h4>
                            <span className="font-mono text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded">
                              {m.shift_cm1} cm⁻¹
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Material: <span className="text-slate-300">{m.material}</span>
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
                          {m.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
