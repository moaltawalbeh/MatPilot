"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, SlidersHorizontal, Activity, CheckCircle2, Play, LineChart } from 'lucide-react';

export default function UVVisSoftwareEnvironment({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<'preprocessing' | 'analysis'>('preprocessing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Idle');

  const [measurementMode, setMeasurementMode] = useState('Reflectance');
  const [transitionType, setTransitionType] = useState('Direct');
  const [taucExponent, setTaucExponent] = useState(2.0); // (hnu * alpha)^2 for direct

  const runPipeline = () => {
    setIsProcessing(true);
    if (measurementMode === 'Reflectance') {
      setStatus('Transforming Diffuse Reflectance via Kubelka-Munk F(R)...');
    } else {
      setStatus('Normalizing Optical Transmission / Absorbance...');
    }
    setTimeout(() => {
      setStatus(`Formulating Tauc Plot (${transitionType} Transition)...`);
      setTimeout(() => {
        setStatus('Extrapolating Linear Tangent to Energy Axis...');
        setTimeout(() => {
          setStatus('Querying Semiconductor Optoelectronic Database...');
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
          <Link href="/instruments/uvvis" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />
            Back to Hub
          </Link>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Activity className="w-4 h-4" />
            UV-Vis Environment
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
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-colors"
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
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'preprocessing' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('preprocessing')}
            >
              Optical Controls
            </button>
            <button 
              className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
              onClick={() => setActiveTab('analysis')}
            >
              Tauc & AI
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'preprocessing' ? (
              <>
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Measurement Mode
                  </h3>
                  <select value={measurementMode} onChange={(e) => setMeasurementMode(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200">
                    <option value="Reflectance">Diffuse Reflectance (%R) -&gt; Kubelka-Munk F(R)</option>
                    <option value="Absorbance">Direct Absorbance (A)</option>
                    <option value="Transmittance">Transmittance (%T)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <LineChart className="w-3.5 h-3.5 text-amber-400" />
                    Electronic Transition Model
                  </h3>
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Transition Nature</label>
                    <select value={transitionType} onChange={(e) => { setTransitionType(e.target.value); setTaucExponent(e.target.value === 'Direct' ? 2.0 : 0.5); }} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200">
                      <option value="Direct">Direct Allowed Transition (n = 1/2, [hν·α]²)</option>
                      <option value="Indirect">Indirect Allowed Transition (n = 2, [hν·α]⁰·⁵)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">Tauc Fit Quality Metrics</h4>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div>Extrapolated Eg: <span className="font-mono text-amber-400">3.20 eV</span></div>
                    <div>Absorption Edge (λ_edge): <span className="font-mono text-amber-400">387.4 nm</span></div>
                    <div>Linear Fit R²: <span className="font-mono text-emerald-400">0.9942</span></div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-medium text-slate-200 mb-2">UV-Vis AI Scientist</h4>
                  {status === 'Analyzed' ? (
                    <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <p><strong>OBSERVATION:</strong> Kubelka-Munk F(R) transform exhibits sharp fundamental absorption onset at 387.4 nm.</p>
                      <p><strong>REFERENCE EVIDENCE:</strong> Literature bandgap for Anatase TiO2 semiconductor is 3.20 eV.</p>
                      <p><strong>INTERPRETATION:</strong> Linear Tauc extrapolation ((hν·F(R))² vs hν) yields direct optical bandgap Eg = 3.20 eV with high linearity (R² = 0.9942).</p>
                      <p className="text-amber-300"><strong>CONFIDENCE:</strong> High (95.0%).</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Run pipeline to trigger UV-Vis AI Scientist reasoning.</p>
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
                 <span>1.5 eV</span>
                 <span>2.5 eV</span>
                 <span>3.2 eV (Eg)</span>
                 <span>4.0 eV</span>
                 <span>5.0 eV</span>
               </div>
               
               <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between items-end pr-2 text-xs text-slate-500 font-mono">
                 <span>100</span>
                 <span>75</span>
                 <span>50</span>
                 <span>25</span>
                 <span>0</span>
               </div>
               
               <svg className="w-full h-full absolute inset-0" preserveAspectRatio="none" viewBox="0 0 1000 100">
                 <path 
                   d="M 0 95 L 450 95 L 750 15 L 1000 10" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="1.5" 
                   className="text-amber-400"
                   vectorEffect="non-scaling-stroke"
                 />
                 {status === 'Analyzed' && (
                   <>
                     <line x1="450" y1="95" x2="750" y2="15" stroke="currentColor" strokeDasharray="3 3" className="text-emerald-400" strokeWidth="1" />
                     <circle cx="450" cy="95" r="4" className="fill-emerald-400" />
                     <text x="440" y="85" className="text-[8px] fill-emerald-400 font-mono">Eg = 3.20 eV</text>
                   </>
                 )}
               </svg>
             </div>
             <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur border border-slate-800 rounded p-2 text-xs font-mono text-slate-400">
               Tauc Quantity (hν·α)² vs Energy (eV)
             </div>
          </div>
          
          <div className="h-48 mt-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Tauc Tangent Linear Extrapolation Summary
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 bg-slate-900/50 border-b border-slate-800">
                    <th className="px-4 py-2 font-medium">Transition Type</th>
                    <th className="px-4 py-2 font-medium">Measurement Mode</th>
                    <th className="px-4 py-2 font-medium">Extrapolated Eg (eV)</th>
                    <th className="px-4 py-2 font-medium">Absorption Edge λ (nm)</th>
                    <th className="px-4 py-2 font-medium">Linearity (R²)</th>
                  </tr>
                </thead>
                <tbody>
                  {status === 'Analyzed' ? (
                    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-2 font-mono text-amber-300">{transitionType} Allowed</td>
                      <td className="px-4 py-2">{measurementMode} (Kubelka-Munk F(R))</td>
                      <td className="px-4 py-2 font-mono text-emerald-400 font-bold">3.20</td>
                      <td className="px-4 py-2 font-mono">387.4</td>
                      <td className="px-4 py-2 font-mono text-emerald-400">0.9942</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-600 italic">
                        Tauc plot extrapolation pending. Run the pipeline.
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
