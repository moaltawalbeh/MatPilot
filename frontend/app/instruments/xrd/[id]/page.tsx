"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, SlidersHorizontal, Activity, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

export default function XRDSoftwareEnvironment({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'preprocessing' | 'analysis'>('preprocessing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Idle');

  const [bgOrder, setBgOrder] = useState(3);
  const [prominence, setProminence] = useState(10.0);
  const [runRietveld, setRunRietveld] = useState(true);

  const runPipeline = () => {
    setIsProcessing(true);
    setStatus('Running Amorphous Background Stripping...');
    setTimeout(() => {
      setStatus('Indexing Bragg Reflections...');
      setTimeout(() => {
        setStatus('Querying Crystallography Open Database (COD)...');
        setTimeout(() => {
          setStatus('Executing Profile Rietveld Refinement...');
          setTimeout(() => {
            setIsProcessing(false);
            setStatus('Analyzed');
          }, 1200);
        }, 1000);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/instruments/xrd" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            Back to Hub
          </Link>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold">
            <Activity className="w-4 h-4" />
            XRD Environment
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
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
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

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex gap-4">
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'preprocessing' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('preprocessing')}
            >
              Crystallographic Controls
            </button>
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('analysis')}
            >
              Rietveld & AI
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'preprocessing' ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Amorphous Background Stripping
                  </h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Polynomial Order</label>
                    <input type="range" min="1" max="6" value={bgOrder} onChange={(e) => setBgOrder(Number(e.target.value))} className="w-full accent-cyan-500" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Order 1</span><span>Order 6</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bragg Peak Threshold</h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Prominence Threshold</label>
                    <input type="range" min="2" max="50" value={prominence} onChange={(e) => setProminence(Number(e.target.value))} className="w-full accent-cyan-500" />
                    <div className="text-right text-xs text-cyan-400 font-medium">{prominence} counts</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytical Level</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={runRietveld} onChange={(e) => setRunRietveld(e.target.checked)} className="accent-cyan-500 rounded" />
                    <span>Level 4: Perform Full-Profile Rietveld Refinement</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Rietveld Fit Quality</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>R_wp (Weighted Profile): <span className="font-mono text-cyan-400">4.25 %</span></div>
                    <div>Goodness-of-Fit (χ²): <span className="font-mono text-emerald-400">1.37</span></div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">XRD AI Scientist</h4>
                  {status === 'Analyzed' ? (
                    <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <p><strong>OBSERVATION:</strong> Primary Bragg reflections at 25.32° 2θ (d = 3.515 Å) and 48.05° 2θ (d = 1.892 Å).</p>
                      <p><strong>REFERENCE EVIDENCE:</strong> 96% match with Anatase TiO2 (COD #9008213, Space Group I41/amd).</p>
                      <p><strong>INTERPRETATION:</strong> Quantitative refinement indicates 85.5 wt% Anatase phase and 14.5 wt% Rutile phase.</p>
                      <p className="text-cyan-300"><strong>CONFIDENCE:</strong> High (92.0%).</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Run pipeline to trigger XRD AI Scientist reasoning.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 bg-black flex flex-col p-4 relative">
          <div className="flex-1 border border-slate-800 rounded-xl bg-slate-900/30 flex items-center justify-center relative overflow-hidden">
             <div className="absolute inset-x-12 inset-y-12 border-b border-l border-slate-700">
               <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-xs text-slate-500 font-mono">
                 <span>10° 2θ</span>
                 <span>30° 2θ</span>
                 <span>50° 2θ</span>
                 <span>70° 2θ</span>
                 <span>90° 2θ</span>
               </div>
               
               <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between items-end pr-2 text-xs text-slate-500 font-mono">
                 <span>500</span>
                 <span>375</span>
                 <span>250</span>
                 <span>125</span>
                 <span>0</span>
               </div>
               
               <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 1000 100">
                 <path 
                   d="M 0 95 L 180 94 L 200 15 L 220 95 L 450 94 L 480 35 L 510 95 L 750 95 L 770 55 L 790 95 L 1000 95" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="1.5" 
                   className="text-cyan-400"
                   vectorEffect="non-scaling-stroke"
                 />
                 {status === 'Analyzed' && (
                   <>
                     <circle cx="200" cy="15" r="4" className="fill-emerald-400" />
                     <text x="195" y="10" className="text-[8px] fill-emerald-400 font-mono">(101) Anatase</text>
                     <circle cx="480" cy="35" r="4" className="fill-emerald-400" />
                     <text x="475" y="30" className="text-[8px] fill-emerald-400 font-mono">(200) Anatase</text>
                   </>
                 )}
               </svg>
             </div>
             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded p-2 text-xs font-mono text-slate-400">
               Intensity (a.u.) vs 2θ (°)
             </div>
          </div>
          
          <div className="h-48 mt-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Bragg Reflections & Indexing
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 bg-slate-900/50 border-b border-slate-800">
                    <th className="px-4 py-2 font-medium">2θ (°)</th>
                    <th className="px-4 py-2 font-medium">d-spacing (Å)</th>
                    <th className="px-4 py-2 font-medium">Rel. Intensity (%)</th>
                    <th className="px-4 py-2 font-medium">FWHM (°)</th>
                    <th className="px-4 py-2 font-medium">Crystallite Size (nm)</th>
                  </tr>
                </thead>
                <tbody>
                  {status === 'Analyzed' ? (
                    <>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-cyan-300">25.32</td>
                        <td className="px-4 py-2 font-mono">3.5150</td>
                        <td className="px-4 py-2 font-mono">100.0</td>
                        <td className="px-4 py-2 font-mono">0.28</td>
                        <td className="px-4 py-2 text-emerald-400">29.4</td>
                      </tr>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-cyan-300">48.05</td>
                        <td className="px-4 py-2 font-mono">1.8920</td>
                        <td className="px-4 py-2 font-mono">35.2</td>
                        <td className="px-4 py-2 font-mono">0.32</td>
                        <td className="px-4 py-2 text-emerald-400">27.1</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-600 italic">
                        No Bragg peaks detected. Run the pipeline.
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
