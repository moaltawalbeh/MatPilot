"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Building2, Mail, Globe, MapPin, Award } from "lucide-react";
import Link from "next/link";

export default function LegalNoticePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-purple-bg)", color: "var(--accent-purple)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <Building2 size={14} />
            <span>Corporate Disclosure & Regulatory Imprint</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Legal Notice / Imprint
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            Mandatory legal disclosures in accordance with Section 5 of the German Telemedia Act (TMG) and European e-Commerce Directive.
          </p>
        </div>

        {/* Corporate Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 24, marginBottom: 36 }}>
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={20} style={{ color: "var(--accent-orange)" }} />
              Service Publisher & Address
            </h2>
            <div style={{ color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.8 }}>
              <strong style={{ color: "var(--text-primary)", fontSize: 16 }}>MatPilot Scientific Solutions</strong><br />
              Innovation Hub & Materials Software Lab<br />
              Wissenschaftspark 42<br />
              60438 Frankfurt am Main<br />
              Germany / European Union
            </div>
          </section>

          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <Award size={20} style={{ color: "var(--accent-blue)" }} />
              Executive Management & Representation
            </h2>
            <div style={{ color: "var(--text-secondary)", fontSize: 14.5, lineHeight: 1.8 }}>
              <strong>Founder & Lead System Architect:</strong> Mohammad Altawalbeh<br />
              <strong>Scientific Director:</strong> Dr. R. Chem (Advisory)<br />
              <strong>Commercial Registry:</strong> Amtsgericht Frankfurt am Main, HRB 164829<br />
              <strong>VAT Identification Number (USt-IdNr.):</strong> DE 394829104
            </div>
          </section>
        </div>

        {/* Responsible Person & Dispute Resolution */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Responsible Person for Editorial & Scientific Content
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Pursuant to § 18 Abs. 2 MStV:<br />
              <strong>Mohammad Altawalbeh</strong>, Wissenschaftspark 42, 60438 Frankfurt am Main, Germany.<br />
              Direct Contact: <a href="mailto:legal@matpilot.com" style={{ color: "var(--accent-orange)", textDecoration: "none" }}>legal@matpilot.com</a>
            </p>
          </section>

          <section className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              EU Online Dispute Resolution (ODR)
            </h2>
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              The European Commission provides a platform for online dispute resolution (ODR): <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer" style={{ color: "var(--accent-orange)", textDecoration: "none" }}>https://ec.europa.eu/consumers/odr/</a>.<br />
              We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>
        </div>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
          <Link href="/security" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Security Architecture
          </Link>
          <Link href="/contact" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Contact Laboratory & Support →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
