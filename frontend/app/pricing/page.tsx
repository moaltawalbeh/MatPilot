"use client";

import React from "react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-matDark text-white selection:bg-matOrange selection:text-black">
      {/* Header Navigation */}
      <nav className="border-b border-matBorder py-4 px-6 lg:px-12 flex justify-between items-center bg-matDark/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-matOrange flex items-center justify-center text-white font-bold font-sans text-lg shadow-md shadow-matOrange/30">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-white font-sans">MatPilot</span>
        </Link>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Link href="/dashboard" className="hover:text-matOrange transition-colors">
            Dashboard
          </Link>
          <Link href="/login" className="px-3.5 py-2 rounded-lg border border-matBorder hover:bg-matElevated transition-all">
            Log in
          </Link>
        </div>
      </nav>

      {/* Main Pricing Section */}
      <main className="max-w-7xl mx-auto py-16 px-6 lg:px-12">
        {/* Commercial Launch Announcement Banner */}
        <div className="mb-12 p-4 md:p-6 rounded-2xl bg-gradient-to-r from-matOrange/20 via-matSurface to-matBlue/20 border border-matOrange/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-matOrange/20 border border-matOrange/40 flex items-center justify-center text-matOrange shrink-0">
              <i className="fas fa-rocket text-lg"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Commercial Subscription Launch</h3>
              <p className="text-xs text-matTextMuted font-mono mt-0.5">
                Commercial subscriptions will launch on <span className="text-matOrange font-bold">January 1, 2027</span>. Currently free for beta researchers!
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-matOrange/10 border border-matOrange/40 text-matOrange font-mono font-bold text-xs shrink-0">
            LAUNCH: JAN 1, 2027
          </span>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-4">
            TRANSPARENT SCIENTIFIC PRICING
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white font-sans">
            Choose Your Analytical Power
          </h1>
          <p className="text-matTextMuted text-base md:text-lg mt-4 font-light leading-relaxed">
            From single-crystal XRD to multi-modal research group collaboration, MatPilot scales with your laboratory needs.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Plan 1: Student Researcher */}
          <div className="p-6 rounded-2xl bg-matSurface border border-matBorder flex flex-col justify-between hover:border-matTextMuted transition-all">
            <div>
              <div className="text-xs font-mono text-matTextDim uppercase">TIER // 01</div>
              <h3 className="text-xl font-bold text-white mt-1">Student Researcher</h3>
              <p className="text-xs text-matTextMuted mt-2 leading-relaxed">Ideal for undergraduate & master students exploring basic XRD phase ID.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-matTextDim font-mono"> / forever free</span>
              </div>

              <ul className="space-y-2.5 text-xs text-matTextMuted border-t border-matBorder pt-4 font-mono">
                <li className="flex items-center gap-2">✓ Basic XRD Phase Identification</li>
                <li className="flex items-center gap-2">✓ Up to 5 Projects & 50 Experiments</li>
                <li className="flex items-center gap-2">✓ Standard PDF Reports</li>
                <li className="flex items-center gap-2">✓ Community Forum Support</li>
              </ul>
            </div>

            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-matElevated border border-matBorder hover:border-white text-white text-center text-xs font-bold font-mono transition-all">
              Get Started Free
            </Link>
          </div>

          {/* Plan 2: Researcher Pro (Popular) */}
          <div className="p-6 rounded-2xl bg-matSurface border-2 border-matOrange relative flex flex-col justify-between shadow-2xl shadow-matOrange/10 transform lg:-translate-y-2">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-matOrange text-matDark text-[10px] font-mono font-black uppercase tracking-wider">
              MOST POPULAR
            </span>

            <div>
              <div className="text-xs font-mono text-matOrange uppercase">TIER // 02</div>
              <h3 className="text-xl font-bold text-white mt-1">Researcher Pro</h3>
              <p className="text-xs text-matTextMuted mt-2 leading-relaxed">For PhD candidates and principal investigators needing full refinement suite.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">$29</span>
                <span className="text-xs text-matTextDim font-mono"> / mo (per user)</span>
              </div>

              <ul className="space-y-2.5 text-xs text-matTextMuted border-t border-matBorder pt-4 font-mono">
                <li className="flex items-center gap-2 text-white">✓ Unlimited XRD, Raman & FTIR Analysis</li>
                <li className="flex items-center gap-2 text-white">✓ Auto & Manual Rietveld Refinement</li>
                <li className="flex items-center gap-2 text-white">✓ Grounded AI Scientific Assistant</li>
                <li className="flex items-center gap-2 text-white">✓ PDF, DOCX, TXT & PPTX Reports</li>
                <li className="flex items-center gap-2 text-white">✓ Williamson–Hall & Strain Plotting</li>
              </ul>
            </div>

            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-matOrange hover:bg-matOrangeLight text-matDark text-center text-xs font-bold font-mono transition-all shadow-lg shadow-matOrange/20">
              Pre-Register for Pro
            </Link>
          </div>

          {/* Plan 3: Research Group */}
          <div className="p-6 rounded-2xl bg-matSurface border border-matBorder flex flex-col justify-between hover:border-matBlue transition-all">
            <div>
              <div className="text-xs font-mono text-matBlue uppercase">TIER // 03</div>
              <h3 className="text-xl font-bold text-white mt-1">Research Group</h3>
              <p className="text-xs text-matTextMuted mt-2 leading-relaxed">Collaborative workspace for university labs & R&D groups.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white font-mono">$99</span>
                <span className="text-xs text-matTextDim font-mono"> / mo (up to 10 users)</span>
              </div>

              <ul className="space-y-2.5 text-xs text-matTextMuted border-t border-matBorder pt-4 font-mono">
                <li className="flex items-center gap-2">✓ Everything in Researcher Pro</li>
                <li className="flex items-center gap-2">✓ Up to 10 Team Members</li>
                <li className="flex items-center gap-2">✓ Shared Group Workspace & Files</li>
                <li className="flex items-center gap-2">✓ Role-Based Access Control</li>
                <li className="flex items-center gap-2">✓ Centralized CIF Reference Database</li>
              </ul>
            </div>

            <Link href="/register" className="w-full mt-8 py-3 rounded-xl bg-matElevated border border-matBorder hover:border-matBlue text-white text-center text-xs font-bold font-mono transition-all">
              Pre-Register for Group
            </Link>
          </div>

          {/* Plan 4: Enterprise */}
          <div className="p-6 rounded-2xl bg-matSurface border border-matBorder flex flex-col justify-between hover:border-emerald-500 transition-all">
            <div>
              <div className="text-xs font-mono text-emerald-400 uppercase">TIER // 04</div>
              <h3 className="text-xl font-bold text-white mt-1">Enterprise Platform</h3>
              <p className="text-xs text-matTextMuted mt-2 leading-relaxed">Custom infrastructure for industrial R&D laboratories & enterprises.</p>
              <div className="my-6">
                <span className="text-3xl font-extrabold text-white font-mono">Custom</span>
              </div>

              <ul className="space-y-2.5 text-xs text-matTextMuted border-t border-matBorder pt-4 font-mono">
                <li className="flex items-center gap-2">✓ Unlimited Users & Custom Dedicated Storage</li>
                <li className="flex items-center gap-2">✓ Programmatic REST API & Webhooks</li>
                <li className="flex items-center gap-2">✓ Enterprise Security & Audit Logging</li>
                <li className="flex items-center gap-2">✓ Single Sign-On (SAML / OAuth / ORCID)</li>
                <li className="flex items-center gap-2">✓ On-Premise / Private Cloud Architecture</li>
              </ul>
            </div>

            <Link href="/contact" className="w-full mt-8 py-3 rounded-xl bg-matElevated border border-matBorder hover:border-emerald-500 text-white text-center text-xs font-bold font-mono transition-all">
              Contact Sales
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
