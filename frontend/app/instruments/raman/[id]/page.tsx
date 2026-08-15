"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, SlidersHorizontal, Activity, CheckCircle2, Play, Zap } from 'lucide-react';

export default function RamanSoftwareEnvironment({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'preprocessing' | 'analysis'>('preprocessing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Idle');

  const [despikeThreshold, setDespikeThreshold] = useState(6.0);
  const [fluorescenceOrder, setFluorescenceOrder] = useState(5);
  const [peakModel, setPeakModel] = useState('pseudo-Voigt');

  const runPipeline = () => {
    setIsProcessing(true);
    setStatus('Despiking Cosmic Rays (Laplacian)...');
    setTimeout(() => {
      setStatus('Subtracting Fluorescence Background...');
      setTimeout(() => {
        setStatus('Deconvoluting Phonon Peaks...');
        setTimeout(() => {
          setStatus('Querying RRUFF Mineral & Carbon DB...');
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
          <Link href="/instruments/raman" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            Back to Hub
          </Link>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Activity className="w-4 h-4" />
            Raman Environment
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
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
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
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'preprocessing' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('preprocessing')}
            >
              Signal Processing
            </button>
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('analysis')}
            >
              Fitting & AI
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'preprocessing' ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Cosmic Ray Despiking
                  </h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Modified Z-Score Threshold</label>
                    <input type="range" min="3" max="12" step="0.5" value={despikeThreshold} onChange={(e) => setDespikeThreshold(Number(e.target.value))} className="w-full accent-emerald-500" />
                    <div className="text-right text-xs text-emerald-400 font-medium">{despikeThreshold} Z</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fluorescence Background</h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Polynomial Order</label>
                    <input type="range" min="2" max="8" value={fluorescenceOrder} onChange={(e) => setFluorescenceOrder(Number(e.target.value))} className="w-full accent-emerald-500" />
                    <div className="text-right text-xs text-emerald-400 font-medium">Order {fluorescenceOrder}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Profile Model</h3>
                  <select value={peakModel} onChange={(e) => setPeakModel(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200">
                    <option value="pseudo-Voigt">pseudo-Voigt (Gaussian + Lorentzian)</option>
                    <option value="Gaussian">Pure Gaussian</option>
                    <option value="Lorentzian">Pure Lorentzian</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Phonon Ratio & Deconvolution</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>ID / IG Area Ratio: <span className="font-mono text-emerald-400">0.24</span></div>
                    <div>G-band Center: <span className="font-mono text-emerald-400">1582.4 cm⁻¹</span></div>
                    <div>Fit Profile Model: <span className="font-mono text-emerald-400">{peakModel}</span></div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Raman AI Scientist</h4>
                  {status === 'Analyzed' ? (
                    <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <p><strong>OBSERVATION:</strong> Active Raman modes observed at 1350.2 cm⁻¹ (D-band) and 1582.4 cm⁻¹ (G-band).</p>
                      <p><strong>REFERENCE EVIDENCE:</strong> 96% match with Multilayer Graphene (RRUFF #R050119).</p>
                      <p><strong>INTERPRETATION:</strong> Low ID/IG ratio (0.24) confirms high structural order with minimal sp³ defect density.</p>
                      <p className="text-emerald-300"><strong>CONFIDENCE:</strong> High (94.0%).</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Run pipeline to trigger Raman AI Scientist reasoning.</p>
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
                 <span>100 cm⁻¹</span>
                 <span>1000 cm⁻¹</span>
                 <span>1800 cm⁻¹</span>
                 <span>2600 cm⁻¹</span>
                 <span>3200 cm⁻¹</span>
               </div>
               
               <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between items-end pr-2 text-xs text-slate-500 font-mono">
                 <span>1000</span>
                 <span>750</span>
                 <span>500</span>
                 <span>250</span>
                 <span>0</span>
               </div>
               
               <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 1000 100">
                 <path 
                   d="M 0 95 L 350 94 L 380 70 L 410 95 L 470 94 L 500 20 L 530 95 L 800 95 L 830 50 L 860 95 L 1000 95" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="1.5" 
                   className="text-emerald-400"
                   vectorEffect="non-scaling-stroke"
                 />
                 {status === 'Analyzed' && (
                   <>
                     <circle cx="380" cy="70" r="4" className="fill-emerald-400" />
                     <text x="375" y="60" className="text-[8px] fill-emerald-400 font-mono">1350 cm⁻¹ (D-band)</text>
                     <circle cx="500" cy="20" r="4" className="fill-emerald-400" />
                     <text x="495" y="15" className="text-[8px] fill-emerald-400 font-mono">1582 cm⁻¹ (G-band)</text>
                   </>
                 )}
               </svg>
             </div>
             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded p-2 text-xs font-mono text-slate-400">
               Intensity (a.u.) vs Raman Shift (cm⁻¹)
             </div>
          </div>
          
          <div className="h-48 mt-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Raman Active Phonon Modes & Deconvolution
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 bg-slate-900/50 border-b border-slate-800">
                    <th className="px-4 py-2 font-medium">Raman Shift (cm⁻¹)</th>
                    <th className="px-4 py-2 font-medium">Intensity (a.u.)</th>
                    <th className="px-4 py-2 font-medium">FWHM (cm⁻¹)</th>
                    <th className="px-4 py-2 font-medium">Integrated Area</th>
                    <th className="px-4 py-2 font-medium">Phonon Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {status === 'Analyzed' ? (
                    <>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-emerald-300">1350.2</td>
                        <td className="px-4 py-2 font-mono">180.5</td>
                        <td className="px-4 py-2 font-mono">35.0</td>
                        <td className="px-4 py-2 font-mono">8214.0</td>
                        <td className="px-4 py-2 text-emerald-400">D-band (Disorder / sp3 Carbon)</td>
                      </tr>
                      <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-emerald-300">1582.4</td>
                        <td className="px-4 py-2 font-mono">750.0</td>
                        <td className="px-4 py-2 font-mono">26.2</td>
                        <td className="px-4 py-2 font-mono">25545.0</td>
                        <td className="px-4 py-2 text-emerald-400">G-band (In-plane sp2 Carbon)</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-600 italic">
                        No phonon modes fitted. Run the pipeline.
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
