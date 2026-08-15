"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { FileText, AlertTriangle, Cpu, Scale, BookOpen } from "lucide-react";
import Link from "next/link";

export default function TermsAndConditionsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <Scale size={14} />
            <span>Standard Software as a Service Agreement</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Terms & Conditions
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            These Terms & Conditions establish the legal terms governing access to and use of the MatPilot materials characterization platform, analytical APIs, and reference databases.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              1. Platform License & Acceptable Use
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Subject to your subscription tier and compliance with these Terms, MatPilot grants you a non-exclusive, non-transferable, revocable license to access the SaaS platform for materials characterization analysis. Users must not reverse engineer, scrape reference crystallographic databases, or use the platform for unlawful activities.
            </p>
          </section>

          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              2. Intellectual Property Rights
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              You retain 100% intellectual property ownership of all experimental data files (XRD, FTIR, Raman, UV-Vis, CIFs), analytical parameters, and generated publication figures uploaded or created within your workspace. MatPilot retains ownership of its platform code, algorithms, UI designs, and documentation.
            </p>
          </section>

          <section className="card" style={{ padding: 28, borderLeft: "4px solid var(--accent-orange)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Cpu size={22} style={{ color: "var(--accent-orange)" }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                3. AI Disclaimer & Scientific Research Disclaimer
              </h2>
            </div>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
              <strong>AI & Algorithmic Assistance Disclaimer:</strong> MatPilot utilizes algorithmic peak detection, similarity ranking engines, and mathematical transformations (including Rietveld refinement, Kramers-Kronig, and Tauc band gap linear regressions) to assist scientific interpretation.
            </p>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              <strong>Research Use Disclaimer:</strong> All phase identifications, crystallographic matches, functional group assignments, and band gap estimates are generated for research assistance and preliminary screening. Users and research authors are solely responsible for independently verifying scientific correctness before publishing in peer-reviewed journals or relying on results for critical engineering applications.
            </p>
          </section>

          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              4. Liability Disclaimer & Limitation of Liability
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              To the maximum extent permitted by applicable law, MatPilot is provided &quot;AS IS&quot; without warranties of merchantability or fitness for a particular purpose. In no event shall MatPilot be liable for indirect, incidental, or consequential damages arising from the use or inability to use the platform.
            </p>
          </section>
        </div>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
          <Link href="/data-processing" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Data Processing Addendum
          </Link>
          <Link href="/cookie-policy" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Cookie Policy →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
