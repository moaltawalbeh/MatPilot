"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Shield, Lock, FileText, CheckCircle2, AlertCircle, Globe, Award } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <Shield size={14} />
            <span>GDPR Compliant Privacy Framework</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            At MatPilot, we respect your privacy and are committed to protecting your personal data and proprietary scientific measurements. This Privacy Policy explains how we collect, process, and safeguard your information in full compliance with the European General Data Protection Regulation (GDPR) and international data privacy standards.
          </p>
          <div style={{ display: "flex", gap: 24, marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
            <span><strong>Effective Date:</strong> August 1, 2026</span>
            <span><strong>Public Launch Version:</strong> MatPilot v1.5.1</span>
            <span><strong>Status:</strong> Active & GDPR Verified</span>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          {/* Section 1 */}
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent-blue-bg)", color: "var(--accent-blue)", display: "grid", placeItems: "center", fontSize: 14 }}>1</span>
              Data Controllership & Scope
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 12 }}>
              MatPilot (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) acts as the Data Controller for account authentication data, subscription billing metadata, and platform usage analytics. For experimental data uploaded to your private workspace (XRD patterns, FTIR spectra, Raman data, UV-Vis spectra, CIF crystal files), MatPilot acts strictly as a Data Processor on behalf of the account owner or research institution.
            </p>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              This policy applies to all users of the MatPilot cloud workspace, CLI tools, and APIs across academic, governmental, and industrial research institutions.
            </p>
          </section>

          {/* Section 2 */}
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent-green-bg)", color: "var(--accent-green)", display: "grid", placeItems: "center", fontSize: 14 }}>2</span>
              Categories of Personal Data Collected
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Account & Identity Data</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  Username, email address, full name, institutional affiliation, and permanent unique User ID (UUID) assigned upon account registration.
                </p>
              </div>
              <div style={{ padding: 16, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Scientific Metadata</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  Project names, sample descriptions, instrument wavelengths, radiation types, and user annotations attached to experimental uploads.
                </p>
              </div>
              <div style={{ padding: 16, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>Technical Diagnostics</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                  IP address, browser user-agent, session timestamps, and encrypted authentication tokens for audit logging and platform security.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", display: "grid", placeItems: "center", fontSize: 14 }}>3</span>
              Lawful Basis of Processing (GDPR Article 6)
            </h2>
            <ul style={{ paddingLeft: 20, color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.8, margin: 0 }}>
              <li><strong>Performance of a Contract (Art. 6(1)(b)):</strong> To provide the MatPilot platform features, maintain your cloud workspace, execute scientific analysis algorithms, and manage your subscription.</li>
              <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> To maintain platform security, prevent unauthorized account access, ensure system stability, and defend intellectual property.</li>
              <li><strong>Legal Obligation (Art. 6(1)(c)):</strong> To comply with mandatory accounting, financial reporting, and GDPR record-keeping regulations.</li>
              <li><strong>Consent (Art. 6(1)(a)):</strong> For non-essential analytical cookies and opt-in promotional communications.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent-purple-bg)", color: "var(--accent-purple)", display: "grid", placeItems: "center", fontSize: 14 }}>4</span>
              Your GDPR Rights
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 16 }}>
              Under Chapter III of the GDPR, you possess absolute control over your personal data. You may exercise any of the following rights at any time by visiting your account settings or contacting our Data Protection Officer:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {[
                { title: "Right of Access (Art. 15)", desc: "Request a copy of all personal data and metadata we hold about your account." },
                { title: "Right to Rectification (Art. 16)", desc: "Correct inaccurate or incomplete institutional or profile information." },
                { title: "Right to Erasure (Art. 17)", desc: "Request permanent deletion of your account and all associated scientific datasets." },
                { title: "Right to Restriction (Art. 18)", desc: "Restrict processing of your data while a dispute or verification is pending." },
                { title: "Right to Data Portability (Art. 20)", desc: "Export your projects, raw files, and analysis results in standard JSON/CSV/CIF formats." },
                { title: "Right to Object (Art. 21)", desc: "Object to processing based on legitimate interests or direct marketing." },
              ].map((right, i) => (
                <div key={i} style={{ padding: 14, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14, marginBottom: 4 }}>{right.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{right.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5 */}
          <section className="card" style={{ padding: 28, borderLeft: "4px solid var(--accent-blue)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
              International Data Transfers & Sub-processors
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              MatPilot hosts primary database clusters within the European Economic Area (EEA) (Frankfurt/Dublin regions). Any international data transfers to third-party sub-processors (such as our transactional email delivery partners) are strictly governed by EU Standard Contractual Clauses (SCCs) and Data Processing Agreements that ensure an equivalent level of GDPR protection.
            </p>
          </section>

          {/* Footer Nav to other legal pages */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16 }}>
            <Link href="/data-privacy" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
              Next: Scientific Data Privacy →
            </Link>
            <Link href="/contact" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "underline" }}>
              Contact Data Protection Officer
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
