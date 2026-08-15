"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-matDark text-white selection:bg-matOrange selection:text-black">
      {/* Header */}
      <nav className="border-b border-matBorder py-4 px-6 lg:px-12 flex justify-between items-center bg-matDark/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-matOrange flex items-center justify-center text-white font-bold font-sans text-lg shadow-md shadow-matOrange/30">
            M
          </div>
          <span className="font-bold text-lg tracking-tight text-white font-sans">MatPilot Privacy Center</span>
        </Link>
        <Link href="/" className="text-xs text-matTextMuted hover:text-white font-mono">
          Back to Home
        </Link>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-16 px-6 lg:px-12">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-4">
            GDPR & ACADEMIC DATA COMPLIANCE
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-sans">
            Privacy Policy & Data Rights
          </h1>
          <p className="text-matTextMuted text-sm font-mono mt-2">
            Last Updated: August 1, 2026 • Version 1.0
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-matTextMuted font-sans">
          <section className="p-6 rounded-2xl bg-matSurface border border-matBorder space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <i className="fas fa-shield-alt text-matOrange"></i> 1. Scientific Data Ownership & Privacy
            </h2>
            <p>
              MatPilot recognizes that materials characterization data (diffraction patterns, CIF files, chemical formulas, and structural models) constitutes critical intellectual property.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs font-mono text-matTextMuted">
              <li>You own 100% of your uploaded raw files, peak fits, and refinement results.</li>
              <li>Your research data is stored in isolated, encrypted cloud workspaces.</li>
              <li>We never sell or monetize your scientific data.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-matSurface border border-matBorder space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <i className="fas fa-brain text-matBlue"></i> 2. AI Assistant & Model Training Data Policy
            </h2>
            <p>
              MatPilot incorporates a scientific AI Research Assistant to explain diffraction patterns and interpret R_wp values.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs font-mono text-matTextMuted">
              <li>Your proprietary experimental files are processed in-memory for immediate context generation.</li>
              <li>Your uploaded data is **NEVER** used to train public or third-party AI foundation models.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-matSurface border border-matBorder space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <i className="fas fa-user-shield text-emerald-400"></i> 3. GDPR Data Rights (&quot;Right to be Forgotten&quot; &amp; Export)
            </h2>
            <p>
              Under European General Data Protection Regulation (GDPR) standards, every registered MatPilot user maintains complete authority over their personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-matElevated border border-matBorder">
                <h4 className="font-bold text-white text-xs mb-1">Data Portability (Export)</h4>
                <p className="text-xs text-matTextDim">
                  Export all personal information, project history, raw intensity datasets, and generated reports as a compressed ZIP file.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-matElevated border border-matBorder">
                <h4 className="font-bold text-white text-xs mb-1">Right to be Forgotten</h4>
                <p className="text-xs text-matTextDim">
                  Permanently erase your user profile, projects, and cloud storage files directly from your User Settings page.
                </p>
              </div>
            </div>
          </section>

          <section className="p-6 rounded-2xl bg-matSurface border border-matBorder space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <i className="fas fa-envelope text-purple-400"></i> 4. Contact Privacy Compliance Officer
            </h2>
            <p>
              If you have any questions regarding research data protection, data processing agreements, or compliance requests, please contact our team:
            </p>
            <p className="font-mono text-xs text-matOrange">
              Email: privacy@matpilot.com
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
