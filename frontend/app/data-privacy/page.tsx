"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Lock, Database, ShieldCheck, EyeOff, Cpu, Server } from "lucide-react";
import Link from "next/link";

export default function DataPrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-purple-bg)", color: "var(--accent-purple)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <Lock size={14} />
            <span>Proprietary Research & Scientific Data Guarantee</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Scientific Data Privacy
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            Materials characterization datasets represent valuable intellectual property and unpublished scientific discoveries. MatPilot enforces strict cryptographic and architectural tenant isolation to guarantee that your experimental measurements remain 100% confidential and exclusive to your account or research group.
          </p>
        </div>

        {/* Core Principles Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
          {[
            {
              icon: EyeOff,
              title: "Zero AI Training Guarantee",
              desc: "MatPilot does not use your uploaded XRD patterns, FTIR/Raman spectra, UV-Vis absorbance curves, or CIF crystal structures to train foundational AI models or public algorithms without explicit written opt-in.",
              color: "var(--accent-orange)",
              bg: "var(--accent-orange-bg)",
            },
            {
              icon: Database,
              title: "Strict Tenant Isolation",
              desc: "Every dataset, project, and experiment is bound cryptographically and at the schema level to your permanent User ID (owner_id). No data can ever cross user or workspace boundaries.",
              color: "var(--accent-blue)",
              bg: "var(--accent-blue-bg)",
            },
            {
              icon: Server,
              title: "EEA Data Hosting & Sovereignty",
              desc: "All raw experimental files and analytical results are hosted in secure EEA cloud infrastructures with strict data residency compliance for EU/international academic and industrial laboratories.",
              color: "var(--accent-green)",
              bg: "var(--accent-green-bg)",
            },
          ].map((item, i) => (
            <div key={i} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, color: item.color, display: "grid", placeItems: "center" }}>
                <item.icon size={20} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Detailed Explanation */}
        <section className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
            Data Processing & Reference Databases
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
            When you perform phase identification or Rietveld refinement, your measured peak positions are compared against reference crystallographic databases (such as the Crystallography Open Database - COD). During this process:
          </p>
          <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.8, margin: 0 }}>
            <li>Your raw experimental data files are never shared with external database providers.</li>
            <li>Similarity scoring and candidate lattice matching occur entirely within MatPilot&apos;s isolated computational sandbox.</li>
            <li>Custom proprietary reference patterns uploaded by your institution are encrypted at rest and accessible only by authorized team members.</li>
          </ul>
        </section>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16 }}>
          <Link href="/privacy-policy" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Privacy Policy
          </Link>
          <Link href="/data-processing" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Data Processing Addendum →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
