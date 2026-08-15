"use client";

import React, { useState } from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Mail, MessageSquare, Building2, Send, CheckCircle2, Phone, MapPin } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    department: "Scientific & Technical Support",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 24px", width: "100%" }}>
        {/* Hero Header */}
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            <MessageSquare size={14} />
            <span>Dedicated Laboratory & Platform Assistance</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: "0 0 16px 0" }}>
            Contact & Support
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 750 }}>
            Connect with our materials characterization support engineers, enterprise licensing advisors, or GDPR Data Protection team.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, marginBottom: 40 }}>
          {/* Form Side */}
          <div className="card" style={{ padding: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              Send a Support Request
            </h2>

            {submitted ? (
              <div style={{ padding: 28, borderRadius: 12, background: "var(--accent-green-bg)", border: "1px solid var(--accent-green)", textAlign: "center" }}>
                <CheckCircle2 size={44} style={{ color: "var(--accent-green)", margin: "0 auto 16px auto" }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Inquiry Received
                </h3>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
                  Thank you for contacting MatPilot. Our support engineers have logged ticket #MP-2026-884 and will reply to <strong>{formData.email}</strong> within 12 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn btn-secondary"
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Eleanor Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Academic / Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.vance@university.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Institution / Laboratory</label>
                    <input
                      type="text"
                      placeholder="Max Planck Institute"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14 }}
                    >
                      <option>Scientific & Technical Support</option>
                      <option>Enterprise Licensing & Sales</option>
                      <option>GDPR / Legal & Privacy</option>
                      <option>General Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rietveld refinement COD library question"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Message *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your question or technical requirement..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontSize: 14, resize: "vertical" }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", fontSize: 14, fontWeight: 600, marginTop: 8 }}
                >
                  <Send size={16} />
                  <span>Submit Support Request</span>
                </button>
              </form>
            )}
          </div>

          {/* Contact Directory Side */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-orange-bg)", color: "var(--accent-orange)", display: "grid", placeItems: "center" }}>
                  <Mail size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Scientific Support</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>XRD, FTIR, Raman & UV-Vis Queries</div>
                </div>
              </div>
              <a href="mailto:support@matpilot.com" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-orange)", textDecoration: "none" }}>
                support@matpilot.com
              </a>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-blue-bg)", color: "var(--accent-blue)", display: "grid", placeItems: "center" }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Enterprise & Team Sales</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Institutional Workspaces & SSO</div>
                </div>
              </div>
              <a href="mailto:enterprise@matpilot.com" style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-blue)", textDecoration: "none" }}>
                enterprise@matpilot.com
              </a>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-green-bg)", color: "var(--accent-green)", display: "grid", placeItems: "center" }}>
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>European Headquarters</h3>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>MatPilot Software Lab</div>
                </div>
              </div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                Wissenschaftspark 42<br />60438 Frankfurt am Main, Germany
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
