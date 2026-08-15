"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { ShieldCheck, Lock, Server, Cpu, CheckCircle2, AlertTriangle, Key } from "lucide-react";
import Link from "next/link";

export default function SecurityPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-green-bg)", color: "var(--accent-green)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <ShieldCheck size={14} />
            <span>Defense-in-Depth Cloud Architecture</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Security Architecture
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            MatPilot is engineered from the ground up to protect mission-critical academic and corporate laboratory research. Discover our multi-layered defense architecture, cryptographic standards, and SOC2/GDPR readiness controls.
          </p>
        </div>

        {/* Security Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
          {[
            {
              title: "SOC2 Type II & GDPR Readiness",
              desc: "Our continuous compliance controls monitor access management, change control, encryption verification, and audit trails aligned with SOC2 Trust Services Criteria.",
              icon: ShieldCheck,
              color: "var(--accent-green)",
              bg: "var(--accent-green-bg)",
            },
            {
              title: "Zero-Trust Tenant Isolation",
              desc: "Every database operation is cryptographically scoped to the authenticated user's User ID (owner_id). No user can access or enumerate another tenant's workspace.",
              icon: Lock,
              color: "var(--accent-blue)",
              bg: "var(--accent-blue-bg)",
            },
            {
              title: "Institutional SSO & SAML 2.0",
              desc: "Enterprise and Research subscription tiers support SAML 2.0 and OpenID Connect (OIDC) integration for university identity federations and industrial LDAP systems.",
              icon: Key,
              color: "var(--accent-purple)",
              bg: "var(--accent-purple-bg)",
            },
            {
              title: "Penetration Testing & Audits",
              desc: "We perform continuous automated vulnerability scanning and annual third-party web application penetration testing across all API endpoints and authentication flows.",
              icon: Server,
              color: "var(--accent-orange)",
              bg: "var(--accent-orange-bg)",
            },
          ].map((card, i) => (
            <div key={i} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, color: card.color, display: "grid", placeItems: "center" }}>
                <card.icon size={20} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Audit & Compliance Table */}
        <section className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Technical Security Controls
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 12px" }}>Control Area</th>
                  <th style={{ padding: "10px 12px" }}>Standard / Implementation</th>
                  <th style={{ padding: "10px 12px" }}>Verification Frequency</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-secondary)" }}>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Transport Encryption</td>
                  <td style={{ padding: "12px" }}>TLS 1.3 with Perfect Forward Secrecy (HSTS Enabled)</td>
                  <td style={{ padding: "12px" }}>Continuous / Real-time</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Storage Encryption</td>
                  <td style={{ padding: "12px" }}>AES-256-GCM encryption at rest across databases and object buckets</td>
                  <td style={{ padding: "12px" }}>Automated daily check</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Authentication Security</td>
                  <td style={{ padding: "12px" }}>Bcrypt password hashing + token_version revocation on logout</td>
                  <td style={{ padding: "12px" }}>Per-request validation</td>
                </tr>
                <tr>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Audit Logging</td>
                  <td style={{ padding: "12px" }}>Tamper-evident activity logs for user logins, uploads, and deletions</td>
                  <td style={{ padding: "12px" }}>Retained for 365 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16 }}>
          <Link href="/cookie-policy" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Cookie Policy
          </Link>
          <Link href="/legal-notice" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Legal Notice & Imprint →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
