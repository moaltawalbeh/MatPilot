"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Cookie, Settings, ShieldAlert, CheckCircle, Info } from "lucide-react";
import Link from "next/link";

export default function CookiePolicyPage() {
  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent("matpilot:openCookieSettings"));
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <Cookie size={14} />
            <span>ePrivacy & GDPR Cookie Transparency</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px 0", maxWidth: 750 }}>
            We use cookies and browser storage technologies to authenticate users, maintain secure workspace sessions, and analyze platform performance. You have full control over non-essential analytical cookies.
          </p>
          <button
            onClick={openCookieSettings}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600 }}
          >
            <Settings size={16} />
            <span>Open Cookie Preferences Modal</span>
          </button>
        </div>

        {/* Cookie Tables */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          {/* Essential */}
          <section className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span className="badge green" style={{ padding: "4px 10px", fontWeight: 700 }}>Strictly Essential</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Required Authentication & Security Cookies</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              These cookies and storage keys are strictly required for account login, cryptographic CSRF protection, and session retention. They cannot be disabled without breaking core platform features.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Key Name</th>
                    <th style={{ padding: "10px 12px" }}>Storage Type</th>
                    <th style={{ padding: "10px 12px" }}>Purpose</th>
                    <th style={{ padding: "10px 12px" }}>Retention</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-secondary)" }}>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "12px", fontFamily: "JetBrains Mono", fontWeight: 600, color: "var(--text-primary)" }}>matpilot_auth_token</td>
                    <td style={{ padding: "12px" }}>HTTP / localStorage</td>
                    <td style={{ padding: "12px" }}>Stores JWT access token for authenticated API requests</td>
                    <td style={{ padding: "12px" }}>30 minutes (Refresh: 7 days)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "12px", fontFamily: "JetBrains Mono", fontWeight: 600, color: "var(--text-primary)" }}>matpilot_cookie_consent</td>
                    <td style={{ padding: "12px" }}>localStorage</td>
                    <td style={{ padding: "12px" }}>Remembers your GDPR consent preferences</td>
                    <td style={{ padding: "12px" }}>1 year</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px", fontFamily: "JetBrains Mono", fontWeight: 600, color: "var(--text-primary)" }}>theme / language</td>
                    <td style={{ padding: "12px" }}>localStorage</td>
                    <td style={{ padding: "12px" }}>Stores dark/light theme and UI locale selection</td>
                    <td style={{ padding: "12px" }}>Indefinite</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Analytical */}
          <section className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span className="badge info" style={{ padding: "4px 10px", fontWeight: 700 }}>Optional / Opt-in</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Analytical & Performance Cookies</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              We use privacy-friendly, anonymized telemetry to monitor page load performance, understand scientific tool usage, and improve UI responsiveness. These cookies are inactive unless you click &quot;Accept All&quot; or enable Analytics in Cookie Settings.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 12px" }}>Key Name</th>
                    <th style={{ padding: "10px 12px" }}>Storage Type</th>
                    <th style={{ padding: "10px 12px" }}>Purpose</th>
                    <th style={{ padding: "10px 12px" }}>Retention</th>
                  </tr>
                </thead>
                <tbody style={{ color: "var(--text-secondary)" }}>
                  <tr>
                    <td style={{ padding: "12px", fontFamily: "JetBrains Mono", fontWeight: 600, color: "var(--text-primary)" }}>_matpilot_analytics</td>
                    <td style={{ padding: "12px" }}>localStorage</td>
                    <td style={{ padding: "12px" }}>Anonymized performance and error diagnostic metrics</td>
                    <td style={{ padding: "12px" }}>90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
          <Link href="/terms-and-conditions" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Terms & Conditions
          </Link>
          <Link href="/security" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Security Architecture →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
