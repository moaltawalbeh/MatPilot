"use client";

import React from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { FileCheck, Shield, Key, Trash2, Clock, Server } from "lucide-react";
import Link from "next/link";

export default function DataProcessingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-blue-bg)", color: "var(--accent-blue)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <FileCheck size={14} />
            <span>Data Processing Addendum (DPA) & Security Architecture</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Data Processing & Retention Policy
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            This Data Processing Addendum governs the technical storage, cryptographic encryption, file retention lifecycle, and permanent deletion of scientific datasets within MatPilot.
          </p>
        </div>

        {/* 3 Pillar Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-green-bg)", color: "var(--accent-green)", display: "grid", placeItems: "center", marginBottom: 12 }}>
              <Key size={20} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Encryption Policy</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              All client-to-server and inter-service traffic is encrypted in transit using <strong>TLS 1.3</strong>. Scientific files and database records are encrypted at rest using industry-standard <strong>AES-256-GCM</strong> with hardware security module (HSM) managed keys.
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", display: "grid", placeItems: "center", marginBottom: 12 }}>
              <Clock size={20} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>File Retention Policy</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              Active user projects and experimental uploads remain available indefinitely while the account is active. Users may configure automated laboratory retention policies (e.g., auto-archive after 3 years or purge after 5 years).
            </p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-red-bg)", color: "var(--accent-red)", display: "grid", placeItems: "center", marginBottom: 12 }}>
              <Trash2 size={20} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>User Deletion & Purging</h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              When a user deletes a project or closes their account, files enter a 30-day recovery soft-delete state. Upon expiry, all raw spectra, CIFs, and metadata are permanently overwritten and purged from database storage and backup media.
            </p>
          </div>
        </div>

        {/* Sub-processor table */}
        <section className="card" style={{ padding: 28, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
            Authorized Sub-processors
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: 12, textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 12px" }}>Sub-processor</th>
                  <th style={{ padding: "10px 12px" }}>Service Provided</th>
                  <th style={{ padding: "10px 12px" }}>Hosting Region</th>
                  <th style={{ padding: "10px 12px" }}>GDPR Safeguard</th>
                </tr>
              </thead>
              <tbody style={{ color: "var(--text-secondary)" }}>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Neon PostgreSQL (AWS EEA)</td>
                  <td style={{ padding: "12px" }}>Relational database & account metadata</td>
                  <td style={{ padding: "12px" }}>Frankfurt, Germany (EEA)</td>
                  <td style={{ padding: "12px" }}>DPA & ISO 27001</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>Cloudflare Inc.</td>
                  <td style={{ padding: "12px" }}>CDN, DDoS protection & DNS routing</td>
                  <td style={{ padding: "12px" }}>Global Anycast (EEA POPs)</td>
                  <td style={{ padding: "12px" }}>EU SCCs & DPA</td>
                </tr>
                <tr>
                  <td style={{ padding: "12px", fontWeight: 600, color: "var(--text-primary)" }}>SMTP / Transactional Email Provider</td>
                  <td style={{ padding: "12px" }}>Account verification & alert notifications</td>
                  <td style={{ padding: "12px" }}>Frankfurt / Dublin (EEA)</td>
                  <td style={{ padding: "12px" }}>EU SCCs & Zero-retention logs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16 }}>
          <Link href="/data-privacy" style={{ color: "var(--text-secondary)", fontSize: 14, textDecoration: "none" }}>
            ← Back to Scientific Data Privacy
          </Link>
          <Link href="/terms-and-conditions" style={{ color: "var(--accent-orange)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Next: Terms & Conditions →
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
