"use client";

import { useState, useEffect, useMemo } from "react";
import { Page } from "@/components/ui/page";
import {
  AudioLines,
  Play,
  RotateCcw,
  Download,
  FileText,
  Search,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from "recharts";

// ── Built-in Standard FTIR Sample Datasets ────────────────────────────────
const SAMPLE_PRESETS: Record<
  string,
  { label: string; description: string; wavenumbers: number[]; intensities: number[] }
> = {
  polystyrene: {
    label: "Polystyrene Standard Film",
    description: "Calibration standard exhibiting aromatic C-H, aliphatic C-H, and benzene ring breathing modes",
    wavenumbers: [
      400, 540, 698, 756, 906, 1028, 1070, 1154, 1182, 1452, 1492, 1601, 1801, 1944, 2850, 2924, 3026, 3082, 3400, 3800, 4000,
    ],
    intensities: [
      0.08, 0.52, 0.96, 0.94, 0.25, 0.68, 0.35, 0.45, 0.42, 0.82, 0.88, 0.76, 0.15, 0.18, 0.74, 0.86, 0.89, 0.65, 0.08, 0.05, 0.04,
    ],
  },
  polycarbonate: {
    label: "Polycarbonate Sheet",
    description: "Engineering thermoplastic showing strong carbonyl (C=O) stretch at 1770 cm⁻¹ and aromatic ester C-O bonds",
    wavenumbers: [
      400, 550, 760, 830, 1014, 1080, 1160, 1190, 1220, 1504, 1595, 1770, 2870, 2968, 3040, 3600, 4000,
    ],
    intensities: [
      0.1, 0.3, 0.45, 0.72, 0.64, 0.58, 0.88, 0.92, 0.91, 0.79, 0.55, 0.98, 0.48, 0.62, 0.51, 0.05, 0.03,
    ],
  },
  ethanol: {
    label: "Ethanol (Aqueous Standard)",
    description: "Exhibits broad hydroxyl (O-H) stretching around 3350 cm⁻¹, C-H stretch, and strong C-O single bond stretch",
    wavenumbers: [
      400, 650, 880, 1045, 1088, 1380, 1450, 1640, 2880, 2970, 3350, 3650, 4000,
    ],
    intensities: [
      0.05, 0.18, 0.54, 0.95, 0.84, 0.66, 0.72, 0.22, 0.81, 0.88, 0.92, 0.25, 0.04,
    ],
  },
};

type FTIRPeak = {
  wavenumber: number;
  intensity: number;
  prominence: number;
  functional_group: string;
  vibrational_mode: string;
  category: string;
  expected_range: string;
};

type FTIRResult = {
  wavenumbers: number[];
  intensities: number[];
  baseline: number[];
  peaks: FTIRPeak[];
  statistics: {
    min_wavenumber: number;
    max_wavenumber: number;
    data_points: number;
    total_peaks_detected: number;
    functional_groups_identified: number;
    baseline_method: string;
    normalize_method: string;
    spectrum_type: string;
  };
};

export default function FTIRCharacterizationPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>("polystyrene");
  const [baselineMethod, setBaselineMethod] = useState<string>("linear");
  const [polyOrder, setPolyOrder] = useState<number>(2);
  const [normalizeMethod, setNormalizeMethod] = useState<string>("max100");
  const [minProminence, setMinProminence] = useState<number>(0.15);
  const [spectrumType, setSpectrumType] = useState<string>("absorbance");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FTIRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"peaks" | "library" | "summary">("peaks");
  const [library, setLibrary] = useState<any[]>([]);
  const [libSearch, setLibSearch] = useState<string>("");

  // Load diagnostic library on mount
  useEffect(() => {
    fetch("/api/v1/ftir/library")
      .then((r) => r.json())
      .then((d) => {
        if (d.groups) setLibrary(d.groups);
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const preset = SAMPLE_PRESETS[selectedPreset];
      const resp = await fetch("/api/v1/ftir/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wavenumbers: preset.wavenumbers,
          intensities: preset.intensities,
          baseline_method: baselineMethod,
          poly_order: polyOrder,
          normalize_method: normalizeMethod,
          min_peak_prominence: minProminence,
          spectrum_type: spectrumType,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.detail || "Failed to analyze FTIR spectrum");
      }
      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during FTIR processing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  // Formatted data for Recharts (reversed X-axis display standard for FTIR: 4000 to 400 cm^-1)
  const chartData = useMemo(() => {
    if (!result) return [];
    const data = result.wavenumbers.map((w, i) => ({
      wavenumber: w,
      Intensity: result.intensities[i],
      Baseline: result.baseline[i],
    }));
    return data.sort((a, b) => b.wavenumber - a.wavenumber);
  }, [result]);

  const filteredLibrary = useMemo(() => {
    if (!libSearch) return library;
    const q = libSearch.toLowerCase();
    return library.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.mode.toLowerCase().includes(q)
    );
  }, [library, libSearch]);

  return (
    <Page
      eyebrow="Scientific Module — Spectroscopy"
      title="FTIR Characterization & Functional Group ID"
      description="Interactive Fourier-transform infrared spectroscopy analysis, automatic baseline correction, peak detection, and diagnostic bond assignment."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Controls & Sample Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <AudioLines className="h-5 w-5" />
                <span>Sample & Parameters</span>
              </div>
              <span className="text-xs bg-purple-500/10 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-medium">
                ISO 10640 Standard
              </span>
            </div>

            {/* Preset Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Reference Calibration Spectrum
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              >
                {Object.entries(SAMPLE_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {SAMPLE_PRESETS[selectedPreset]?.description}
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="linear">Linear Endpoint</option>
                  <option value="poly">Polynomial Fit</option>
                  <option value="none">None (Raw)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Normalization
                </label>
                <select
                  value={normalizeMethod}
                  onChange={(e) => setNormalizeMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="max100">Max = 100%</option>
                  <option value="minmax">Min-Max (0–1)</option>
                  <option value="none">Raw Absorbance</option>
                </select>
              </div>
            </div>

            {/* Poly Order */}
            {baselineMethod === "poly" && (
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Polynomial Order</span>
                  <span className="font-mono text-purple-400">{polyOrder}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={polyOrder}
                  onChange={(e) => setPolyOrder(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            )}

            {/* Prominence Threshold */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Peak Prominence Filter</span>
                <span className="font-mono text-purple-400">{minProminence.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={minProminence}
                onChange={(e) => setMinProminence(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{loading ? "Processing..." : "Analyze Spectrum"}</span>
              </button>
              <button
                onClick={() => {
                  setBaselineMethod("linear");
                  setNormalizeMethod("max100");
                  setMinProminence(0.15);
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
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span>Analytical Diagnostics</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Peaks Detected</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {result.statistics.total_peaks_detected}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Functional Groups</div>
                  <div className="text-xl font-bold text-purple-400 mt-0.5">
                    {result.statistics.functional_groups_identified}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Spectral Window</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1">
                    {result.statistics.min_wavenumber}–{result.statistics.max_wavenumber} cm⁻¹
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Baseline Mode</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1 capitalize">
                    {result.statistics.baseline_method}
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
                  <span>Infrared Absorbance Spectrum</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-normal">
                    {SAMPLE_PRESETS[selectedPreset]?.label}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  X-axis displayed from high to low wavenumber (4000 → 400 cm⁻¹) as per IUPAC spectroscopy standards
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="wavenumber"
                      reversed={true}
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      stroke="#64748b"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Wavenumber (cm⁻¹)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      label={{ value: "Absorbance (%)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090d16",
                        borderColor: "#1e293b",
                        borderRadius: "0.75rem",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{ color: "#a855f7", fontWeight: 600 }}
                      formatter={(val: any) => [`${Number(val).toFixed(2)}`, ""]}
                      labelFormatter={(label: any) => `Wavenumber: ${label} cm⁻¹`}
                    />
                    <Line
                      type="monotone"
                      dataKey="Intensity"
                      name="Absorbance"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 6, fill: "#c084fc", stroke: "#fff", strokeWidth: 2 }}
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
                  Click &ldquo;Analyze Spectrum&rdquo; to process FTIR data
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
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Detected Peaks &amp; Assignments ({result?.peaks.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "library"
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Diagnostic Reference Library ({library.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("summary")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "summary"
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Analytical Report Summary</span>
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
                          <th className="py-3 px-3">Wavenumber (cm⁻¹)</th>
                          <th className="py-3 px-3">Intensity</th>
                          <th className="py-3 px-3">Functional Group</th>
                          <th className="py-3 px-3">Vibrational Mode</th>
                          <th className="py-3 px-3">Standard Band Range</th>
                          <th className="py-3 px-3">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {result.peaks.map((peak, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-purple-300">
                              {peak.wavenumber.toFixed(1)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {peak.intensity.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-medium text-white">
                              {peak.functional_group}
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-300">
                                {peak.vibrational_mode}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-slate-400">
                              {peak.expected_range}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  peak.functional_group === "Unassigned"
                                    ? "bg-slate-800 text-slate-400"
                                    : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                }`}
                              >
                                {peak.category}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      No peaks detected matching prominence threshold ({minProminence.toFixed(2)}). Try lowering the slider.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REFERENCE LIBRARY */}
              {activeTab === "library" && (
                <div className="space-y-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter functional groups or bands..."
                      value={libSearch}
                      onChange={(e) => setLibSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredLibrary.map((g, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-white text-sm">{g.name}</h4>
                            <span className="font-mono text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                              {g.min_cm1}–{g.max_cm1} cm⁻¹
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Category: <span className="text-slate-300">{g.category}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
                          <span>Mode: {g.mode}</span>
                          <span>Intensity: {g.intensity_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: REPORT SUMMARY */}
              {activeTab === "summary" && result && (
                <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-purple-200">
                    <p className="font-semibold mb-1">Automated Infrared Characterization Summary:</p>
                    <p className="text-xs text-purple-300 leading-normal">
                      FTIR spectroscopy of {SAMPLE_PRESETS[selectedPreset]?.label} analyzed over {result.statistics.min_wavenumber}–{result.statistics.max_wavenumber} cm⁻¹.
                      A total of {result.statistics.total_peaks_detected} distinct absorption peaks were identified, characterizing {result.statistics.functional_groups_identified} chemical groups in accordance with ASTM E168 infrared analysis protocols.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Fingerprint Region (&lt;1500 cm⁻¹)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Contains {result.peaks.filter((p) => p.wavenumber < 1500).length} characteristic skeletal bending and C-O/C-C single bond stretching modes unique to the molecular backbone.
                      </p>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Functional Group Region (≥1500 cm⁻¹)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Contains {result.peaks.filter((p) => p.wavenumber >= 1500).length} high-frequency stretching vibrations diagnostic of O-H, C=O carbonyl, and C-H aliphatic/aromatic bonds.
                      </p>
                    </div>
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
