"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Activity, Calendar } from 'lucide-react';

const mockExperiments = [
  { id: '1', name: 'Multilayer Graphene D/G Ratio', status: 'Analyzed', date: '2026-08-10' },
  { id: '2', name: 'Silicon Substrate Phonon Mode', status: 'Created', date: '2026-08-11' },
];

export default function RamanHubPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-light text-emerald-400 mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8" />
            Raman Spectroscopy
          </h1>
          <p className="text-slate-400">Vibrational Phonon Mode Analysis & Cosmic Ray Despiking Environment</p>
        </header>

        <div className="flex justify-between items-center mb-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-2.5 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search Raman experiments..." 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Raman Experiment
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-800">
                <th className="p-4 font-medium">Experiment Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date Created</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mockExperiments.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-800 hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-medium text-slate-200">{exp.name}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${exp.status === 'Analyzed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {exp.date}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/instruments/raman/${exp.id}`} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                      Open Environment &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
