"use client";

import { useState, useEffect, useMemo } from "react";
import { Page } from "@/components/ui/page";
import {
  Sun,
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
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// ── Built-in Standard UV-Vis & Semiconductor Datasets ─────────────────────
const UVVIS_PRESETS: Record<
  string,
  {
    label: string;
    description: string;
    spectrum_type: string;
    transition_type: string;
    wavelengths: number[];
    intensities: number[];
  }
> = {
  zno: {
    label: "Zinc Oxide (ZnO) Thin Film",
    description: "Wide-bandgap semiconductor exhibiting sharp direct absorption edge at ~375 nm (Eg ≈ 3.30 eV)",
    spectrum_type: "absorbance",
    transition_type: "direct_allowed",
    wavelengths: [
      300, 320, 340, 360, 370, 375, 380, 390, 410, 450, 500, 600, 700, 800,
    ],
    intensities: [
      2.1, 2.08, 2.05, 1.95, 1.8, 1.4, 0.45, 0.12, 0.08, 0.05, 0.04, 0.03, 0.02, 0.02,
    ],
  },
  tio2: {
    label: "Anatase TiO₂ Photoanode Powder (DRS)",
    description: "Diffuse reflectance spectrum processed via Kubelka-Munk F(R) transform (Indirect allowed Eg ≈ 3.20 eV)",
    spectrum_type: "diffuse_reflectance",
    transition_type: "indirect_allowed",
    wavelengths: [
      300, 325, 350, 370, 385, 400, 420, 450, 500, 600, 700, 800,
    ],
    intensities: [
      0.08, 0.09, 0.11, 0.15, 0.35, 0.72, 0.85, 0.88, 0.90, 0.91, 0.92, 0.93,
    ],
  },
  perovskite: {
    label: "MAPbI₃ Halide Perovskite Absorber",
    description: "Photovoltaic thin film with high direct optical absorption and band edge at ~785 nm (Eg ≈ 1.58 eV)",
    wavelengths: [
      400, 450, 500, 550, 600, 650, 700, 750, 780, 795, 820, 850, 900,
    ],
    intensities: [
      1.85, 1.82, 1.78, 1.72, 1.65, 1.58, 1.48, 1.25, 0.75, 0.18, 0.08, 0.05, 0.04,
    ],
    spectrum_type: "absorbance",
    transition_type: "direct_allowed",
  },
};

type UVVisResult = {
  band_gap_ev: number;
  r_squared: number;
  fit_range_ev: [number, number];
  absorption_edge_nm: number;
  energy_ev: number[];
  tauc_values: number[];
  processed_intensities: number[];
  peaks: {
    wavelength_nm: number;
    energy_ev: number;
    intensity: number;
    prominence: number;
  }[];
  statistics: {
    spectrum_type: string;
    transition_type: string;
    exponent_n: number;
    data_points: number;
    min_wavelength: number;
    max_wavelength: number;
  };
};

export default function UVVisCharacterizationPage() {
  const [selectedPreset, setSelectedPreset] = useState<string>("zno");
  const [spectrumType, setSpectrumType] = useState<string>("absorbance");
  const [transitionType, setTransitionType] = useState<string>("direct_allowed");
  const [chartMode, setChartMode] = useState<"tauc" | "spectrum">("tauc");

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<UVVisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bandgap" | "peaks" | "theory">("bandgap");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const preset = UVVIS_PRESETS[selectedPreset];
      const resp = await fetch("/api/v1/uv_vis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wavelengths: preset.wavelengths,
          intensities: preset.intensities,
          spectrum_type: spectrumType,
          transition_type: transitionType,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || json.status !== "success") {
        throw new Error(json.detail || "Failed to analyze UV-Vis spectrum");
      }
      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during UV-Vis Tauc processing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const preset = UVVIS_PRESETS[selectedPreset];
    if (preset) {
      setSpectrumType(preset.spectrum_type);
      setTransitionType(preset.transition_type);
    }
  }, [selectedPreset]);

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset, spectrumType, transitionType]);

  // Formatted data for Tauc plot: Energy (eV) on X-axis vs Tauc Value (αhν)^n on Y-axis
  const taucChartData = useMemo(() => {
    if (!result) return [];
    return result.energy_ev.map((e, i) => ({
      energy: Number(e.toFixed(3)),
      tauc: Number(result.tauc_values[i].toFixed(4)),
    })).sort((a, b) => a.energy - b.energy);
  }, [result]);

  // Formatted data for Raw Optical Spectrum: Wavelength (nm) on X-axis vs Intensity
  const spectrumChartData = useMemo(() => {
    if (!result) return [];
    const preset = UVVIS_PRESETS[selectedPreset];
    return preset.wavelengths.map((w, i) => ({
      wavelength: w,
      Intensity: preset.intensities[i],
      Processed: result.processed_intensities[i],
    })).sort((a, b) => a.wavelength - b.wavelength);
  }, [result, selectedPreset]);

  return (
    <Page
      eyebrow="Scientific Module — Spectroscopy"
      title="UV-Vis & Tauc Plot Optical Band Gap Analysis"
      description="Interactive optical absorbance and diffuse reflectance spectroscopy, automatic Kubelka-Munk transformation, and Tauc plot linear regression for semiconductor band gap (E_g) determination."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Controls & Sample Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Sun className="h-5 w-5" />
                <span>Optical Parameters</span>
              </div>
              <span className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
                Tauc &amp; Kubelka-Munk
              </span>
            </div>

            {/* Preset Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Semiconductor Material Sample
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              >
                {Object.entries(UVVIS_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {UVVIS_PRESETS[selectedPreset]?.description}
              </p>
            </div>

            {/* Spectrum Type */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Measurement Mode
              </label>
              <select
                value={spectrumType}
                onChange={(e) => setSpectrumType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="absorbance">Transmission Absorbance (A)</option>
                <option value="diffuse_reflectance">Diffuse Reflectance DRS (Kubelka-Munk F(R))</option>
                <option value="transmittance">Transmittance (%T)</option>
              </select>
            </div>

            {/* Transition Type */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Electronic Band Transition Type
              </label>
              <select
                value={transitionType}
                onChange={(e) => setTransitionType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="direct_allowed">Direct Allowed (n = 2)</option>
                <option value="indirect_allowed">Indirect Allowed (n = 1/2)</option>
                <option value="direct_forbidden">Direct Forbidden (n = 3/2)</option>
                <option value="indirect_forbidden">Indirect Forbidden (n = 1/3)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm py-2.5 px-4 rounded-xl shadow-lg shadow-amber-900/30 transition-all disabled:opacity-50"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{loading ? "Calculating..." : "Calculate Band Gap"}</span>
              </button>
              <button
                onClick={() => {
                  setSpectrumType(UVVIS_PRESETS[selectedPreset]?.spectrum_type || "absorbance");
                  setTransitionType(UVVIS_PRESETS[selectedPreset]?.transition_type || "direct_allowed");
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
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Semiconductor Optical Band Gap</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <div className="text-xs text-amber-300 font-medium">Optical E_g</div>
                  <div className="text-2xl font-bold text-amber-400 mt-0.5">
                    {result.band_gap_ev.toFixed(2)} eV
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Absorption Edge</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {result.absorption_edge_nm.toFixed(1)} nm
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Linear R² Fit</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1">
                    {result.r_squared.toFixed(4)}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-xs text-slate-400">Transition Exponent</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1">
                    n = {result.statistics.exponent_n}
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
                  <span>
                    {chartMode === "tauc"
                      ? "Tauc Plot — (αhν)ⁿ vs Photon Energy"
                      : "Optical Spectrum — Absorbance / F(R) vs Wavelength"}
                  </span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-normal">
                    {UVVIS_PRESETS[selectedPreset]?.label}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {chartMode === "tauc"
                    ? `Linear extrapolation of absorption edge to baseline determines E_g = ${result?.band_gap_ev.toFixed(2) || "—"} eV`
                    : "Raw optical absorbance or diffuse reflectance Kubelka-Munk spectrum"}
                </p>
              </div>

              {/* Toggle Chart Mode */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setChartMode("tauc")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    chartMode === "tauc"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tauc Plot (E_g)
                </button>
                <button
                  onClick={() => setChartMode("spectrum")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    chartMode === "spectrum"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Optical Spectrum (nm)
                </button>
              </div>
            </div>

            <div className="h-80 w-full">
              {result ? (
                chartMode === "tauc" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={taucChartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="energy"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Photon Energy hν (eV)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "(αhν)ⁿ", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          borderColor: "#1e293b",
                          borderRadius: "0.75rem",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                        }}
                        labelStyle={{ color: "#f59e0b", fontWeight: 600 }}
                        formatter={(val: any) => [`${Number(val).toFixed(4)}`, "(αhν)ⁿ"]}
                        labelFormatter={(label: any) => `Energy: ${label} eV`}
                      />
                      <ReferenceLine
                        x={result.band_gap_ev}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        label={{
                          value: `E_g = ${result.band_gap_ev.toFixed(2)} eV`,
                          fill: "#f59e0b",
                          fontSize: 12,
                          position: "top",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tauc"
                        name="Tauc Value"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, fill: "#fbbf24", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={spectrumChartData} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="wavelength"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Wavelength λ (nm)", position: "bottom", offset: 0, fill: "#94a3b8", fontSize: 12 }}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        label={{ value: "Absorbance / F(R)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          borderColor: "#1e293b",
                          borderRadius: "0.75rem",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                        }}
                        labelStyle={{ color: "#38bdf8", fontWeight: 600 }}
                        formatter={(val: any) => [`${Number(val).toFixed(3)}`, ""]}
                        labelFormatter={(label: any) => `Wavelength: ${label} nm`}
                      />
                      <ReferenceLine
                        x={result.absorption_edge_nm}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{
                          value: `Edge ~${result.absorption_edge_nm.toFixed(0)} nm`,
                          fill: "#f59e0b",
                          fontSize: 11,
                          position: "insideTopRight",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Intensity"
                        name="Intensity"
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, fill: "#7dd3fc", stroke: "#fff", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Click &ldquo;Calculate Band Gap&rdquo; to process UV-Vis data
                </div>
              )}
            </div>
          </div>

          {/* Results Navigation Tabs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-3">
              <button
                onClick={() => setActiveTab("bandgap")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "bandgap"
                    ? "border-amber-500 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Band Gap Regression Fit</span>
              </button>
              <button
                onClick={() => setActiveTab("peaks")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "peaks"
                    ? "border-amber-500 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                <span>Absorption Peaks ({result?.peaks.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("theory")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "theory"
                    ? "border-amber-500 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Semiconductor Optical Theory Guide</span>
              </button>
            </div>

            <div className="p-5">
              {/* TAB 1: BAND GAP REPORT */}
              {activeTab === "bandgap" && result && (
                <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200">
                    <p className="font-semibold mb-1">Optical Band Gap Summary:</p>
                    <p className="text-xs text-amber-300 leading-normal">
                      The optical band gap of {UVVIS_PRESETS[selectedPreset]?.label} was determined to be{" "}
                      <span className="font-bold text-amber-400">{result.band_gap_ev.toFixed(2)} eV</span> using linear Tauc plot regression (R² = {result.r_squared.toFixed(4)}) over the linear edge region {result.fit_range_ev[0].toFixed(2)}–{result.fit_range_ev[1].toFixed(2)} eV.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Kubelka-Munk F(R) Transformation
                      </h4>
                      <p className="text-xs text-slate-400">
                        For diffuse reflectance spectra (DRS), reflectance R is converted to optical absorption coefficient K via the Kubelka-Munk function: F(R) = (1 - R)² / (2R).
                      </p>
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Absorption Edge Relation
                      </h4>
                      <p className="text-xs text-slate-400">
                        The onset of interband electronic transitions occurs at wavelength λ_edge ≈ {result.absorption_edge_nm.toFixed(1)} nm, calculated via λ(nm) = 1240 / E_g(eV).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PEAKS TABLE */}
              {activeTab === "peaks" && (
                <div className="overflow-x-auto">
                  {result && result.peaks.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-3 px-3">Wavelength (nm)</th>
                          <th className="py-3 px-3">Photon Energy (eV)</th>
                          <th className="py-3 px-3">Peak Intensity / F(R)</th>
                          <th className="py-3 px-3">Prominence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {result.peaks.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-semibold text-amber-300">
                              {p.wavelength_nm.toFixed(1)} nm
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-200">
                              {p.energy_ev.toFixed(2)} eV
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {p.intensity.toFixed(3)}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">
                              {p.prominence.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-sm">
                      No discrete absorption peak maxima detected above background threshold.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: THEORY GUIDE */}
              {activeTab === "theory" && (
                <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2">Tauc Equation for Interband Optical Transitions</h4>
                    <p className="text-slate-400 mb-2">
                      The relationship between absorption coefficient α and photon energy hν is governed by the Tauc equation:
                    </p>
                    <div className="bg-slate-900 px-3 py-2 rounded-lg font-mono text-amber-300 my-2">
                      (αhν)¹/ⁿ = A(hν - E_g)
                    </div>
                    <p className="text-slate-400">
                      Where exponent <span className="text-amber-300 font-bold">n</span> depends on the transition selection rules:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-slate-400">
                      <li><strong className="text-slate-200">n = 1/2 (Direct Allowed):</strong> ZnO, GaAs, MAPbI₃ Perovskites, CdS</li>
                      <li><strong className="text-slate-200">n = 2 (Indirect Allowed):</strong> Anatase TiO₂, Silicon, Germanium</li>
                      <li><strong className="text-slate-200">n = 3/2 (Direct Forbidden):</strong> Certain transition metal oxides</li>
                      <li><strong className="text-slate-200">n = 3 (Indirect Forbidden):</strong> Disordered amorphous systems</li>
                    </ul>
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
