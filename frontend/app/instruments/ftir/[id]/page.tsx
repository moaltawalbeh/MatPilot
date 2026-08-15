"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, SlidersHorizontal, Activity, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

export default function FTIRSoftwareEnvironment({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'preprocessing' | 'analysis'>('preprocessing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Idle');

  // Simulated state for the sidebar controls
  const [baselineOrder, setBaselineOrder] = useState(1);
  const [smoothingWindow, setSmoothingWindow] = useState(11);
  const [peakProminence, setPeakProminence] = useState(2.0);

  const runPipeline = () => {
    setIsProcessing(true);
    setStatus('Running Scientific Engine...');
    setTimeout(() => {
      setStatus('Validating Data...');
      setTimeout(() => {
        setStatus('Querying OpenSpecy...');
        setTimeout(() => {
          setStatus('AI Interpreting Results...');
          setTimeout(() => {
            setIsProcessing(false);
            setStatus('Analyzed');
          }, 1500);
        }, 1000);
      }, 1000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/instruments/ftir" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            Back to Hub
          </Link>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 text-fuchsia-400 font-semibold">
            <Activity className="w-4 h-4" />
            FTIR Environment
          </div>
          <span className="text-slate-500 text-sm">/</span>
          <span className="text-sm font-medium">Experiment {params.id}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-1 rounded flex items-center gap-1.5 ${status === 'Analyzed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {status === 'Analyzed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
            {status}
          </span>
          <button 
            onClick={runPipeline}
            disabled={isProcessing}
            className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {isProcessing ? 'Processing...' : 'Run Pipeline'}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Scientific Controls */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex gap-4">
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'preprocessing' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('preprocessing')}
            >
              Pre-Processing
            </button>
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('analysis')}
            >
              Analysis & AI
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'preprocessing' ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Baseline Correction
                  </h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Polynomial Order</label>
                    <input type="range" min="1" max="5" value={baselineOrder} onChange={(e) => setBaselineOrder(Number(e.target.value))} className="w-full accent-fuchsia-500" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Linear (1)</span><span>Quintic (5)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Smoothing</h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Savitzky-Golay Window</label>
                    <input type="range" min="5" max="21" step="2" value={smoothingWindow} onChange={(e) => setSmoothingWindow(Number(e.target.value))} className="w-full accent-fuchsia-500" />
                    <div className="text-right text-xs text-fuchsia-400 font-medium">{smoothingWindow} pts</div>
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Detection</h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Prominence Threshold</label>
                    <input type="range" min="0.5" max="10" step="0.5" value={peakProminence} onChange={(e) => setPeakProminence(Number(e.target.value))} className="w-full accent-fuchsia-500" />
                    <div className="text-right text-xs text-fuchsia-400 font-medium">{peakProminence} %</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Scientific Validation</h4>
                  <div className="flex items-center gap-2 text-sm text-emerald-400 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Signal-to-Noise: 45.2 dB
                  </div>
                  <div className="flex items-start gap-2 text-xs text-amber-400/80">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Minor baseline drift detected at &lt; 1000 cm⁻¹
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">AI Scientist Interpretation</h4>
                  {status === 'Analyzed' ? (
                    <div className="text-sm text-slate-300 space-y-2 leading-relaxed">
                      <p>Based on the verified spectra, the broad absorption band at <strong>3300 cm⁻¹</strong> strongly indicates O-H stretching.</p>
                      <p>The sharp peak at <strong>1715 cm⁻¹</strong> confirms the presence of a C=O (Carbonyl) stretching mode.</p>
                      <p className="text-fuchsia-300 font-medium pt-2">Conclusion: OpenSpecy corroborates these findings with a 94% match for Poly(ethylene terephthalate).</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Run the pipeline to generate AI analysis.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas: The Spectrum Chart */}
        <main className="flex-1 bg-black flex flex-col p-4 relative">
          {/* Mock Chart Area */}
          <div className="flex-1 border border-slate-800 rounded-xl bg-slate-900/30 flex items-center justify-center relative overflow-hidden">
             
             {/* Chart Placeholder (Recharts would go here) */}
             <div className="absolute inset-x-12 inset-y-12 border-b border-l border-slate-700">
               {/* Reversed X-Axis labels for FTIR */}
               <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-slate-500 font-mono">
                 <span>4000 cm⁻¹</span>
                 <span>3000 cm⁻¹</span>
                 <span>2000 cm⁻¹</span>
                 <span>1000 cm⁻¹</span>
                 <span>400 cm⁻¹</span>
               </div>
               
               {/* Y-Axis labels */}
               <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between items-end pr-2 text-xs text-slate-500 font-mono">
                 <span>100%</span>
                 <span>80%</span>
                 <span>60%</span>
                 <span>40%</span>
                 <span>20%</span>
               </div>
               
               {/* Mock Data Line (SVG representation) */}
               <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 1000 100">
                 <path 
                   d="M 0 10 L 100 12 L 150 11 L 180 50 L 220 15 L 400 18 L 500 15 L 600 75 L 650 18 L 800 25 L 900 85 L 950 20 L 1000 10" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="1.5" 
                   className="text-fuchsia-500"
                   vectorEffect="non-scaling-stroke"
                 />
                 
                 {/* Detected Peaks Annotations (Shown only if analyzed) */}
                 {status === 'Analyzed' && (
                   <>
                     <circle cx="180" cy="50" r="4" className="fill-emerald-400" />
                     <text x="175" y="40" className="text-[8px] fill-emerald-400 font-mono">3300 cm⁻¹ (O-H)</text>
                     
                     <circle cx="600" cy="75" r="4" className="fill-emerald-400" />
                     <text x="595" y="65" className="text-[8px] fill-emerald-400 font-mono">1715 cm⁻¹ (C=O)</text>
                   </>
                 )}
               </svg>
             </div>
             
             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded p-2 text-xs font-mono text-slate-400">
               Transmittance (%) vs Wavenumber (cm⁻¹)
             </div>
          </div>
          
          {/* Bottom Table: Peak List */}
          <div className="h-48 mt-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Assigned Functional Groups
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 bg-slate-900/50 border-b border-slate-800">
                    <th className="px-4 py-2 font-medium">Wavenumber (cm⁻¹)</th>
                    <th className="px-4 py-2 font-medium">Transmittance (%)</th>
                    <th className="px-4 py-2 font-medium">Functional Group</th>
                    <th className="px-4 py-2 font-medium">Vibrational Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {status === 'Analyzed' ? (
                    <>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-fuchsia-300">3301.2</td>
                        <td className="px-4 py-2 font-mono">42.5</td>
                        <td className="px-4 py-2">O-H or N-H</td>
                        <td className="px-4 py-2 text-slate-400">Stretching</td>
                      </tr>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-fuchsia-300">1715.8</td>
                        <td className="px-4 py-2 font-mono">25.1</td>
                        <td className="px-4 py-2">C=O (Carbonyl)</td>
                        <td className="px-4 py-2 text-slate-400">Stretching</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-600 italic">
                        No peaks detected yet. Run the pipeline.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
        
      </div>
    </div>
  );
}
