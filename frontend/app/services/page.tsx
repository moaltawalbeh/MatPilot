"use client";

import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import Link from "next/link";
import { BarChart3, Search, Target, Database, FileText, Atom, Sparkles, MessageSquare } from "lucide-react";

const services = [
  {
    slug: "xrd-analysis",
    icon: BarChart3,
    title: "XRD Pattern Analysis",
    description: "Upload and analyze powder X-ray diffraction patterns with automated background correction, Kα2 stripping, and noise reduction.",
    features: ["Background Correction", "Kα2 Stripping", "Noise Reduction", "Peak Detection"],
  },
  {
    slug: "phase-identification",
    icon: Search,
    title: "Phase Identification",
    description: "Automatically match experimental diffraction patterns against crystallographic databases including the Crystallography Open Database.",
    features: ["COD API Search", "Local Database", "Similarity Scoring", "Confidence Ranking"],
  },
  {
    slug: "rietveld-refinement",
    icon: Target,
    title: "Rietveld Refinement",
    description: "Perform least-squares Rietveld refinement to extract lattice parameters, phase fractions, and structural details from multiphase samples.",
    features: ["Auto Workflow", "Manual Mode", "Profile Fitting", "Quality Metrics"],
  },
  {
    slug: "reference-search",
    icon: Database,
    title: "Reference Database Search",
    description: "Search the Crystallography Open Database and a curated local database of 50+ common crystalline materials with pre-computed diffraction peaks.",
    features: ["Formula Search", "Element Search", "CIF Download", "Theoretical Patterns"],
  },
  {
    slug: "cif-processing",
    icon: FileText,
    title: "CIF Processing",
    description: "Upload and parse Crystallographic Information Files to extract crystal structures, unit cell parameters, and atomic positions.",
    features: ["CIF Parsing", "Structure Validation", "Unit Cell Extraction", "Upload & Cache"],
  },
  {
    slug: "crystal-visualization",
    icon: Atom,
    title: "Crystal Structure Visualization",
    description: "Visualize crystal structures in 3D with unit cell parameters, space group information, and atomic positions from CIF data.",
    features: ["3D Viewer", "Unit Cell Display", "Atomic Positions", "Space Group Info"],
  },
  {
    slug: "ai-assistant",
    icon: MessageSquare,
    title: "AI Assistant",
    description: "Get expert help from an AI-powered assistant for materials science questions, crystallography concepts, and analysis result interpretation.",
    features: ["Materials Science", "Crystallography", "Result Explanation", "Context-Aware"],
  },
  {
    slug: "report-generation",
    icon: Sparkles,
    title: "Scientific Report Generation",
    description: "Generate publication-quality PDF reports with diffraction pattern figures, analysis tables, methodology descriptions, and Rietveld results.",
    features: ["PDF Export", "Pattern Figures", "Phase Tables", "Rietveld Summary"],
  },
];

export default function ServicesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 32px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
            Our <span style={{ color: "var(--accent-orange)" }}>Services</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            Comprehensive suite of scientific tools for materials characterization and X-ray diffraction analysis.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.slug}
                href={service.slug === "ai-assistant" ? "/dashboard" : `/services/${service.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div className="card" style={{ padding: 24, height: "100%", cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-orange)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "var(--radius-md)",
                      background: "var(--accent-orange-bg)",
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      <Icon size={18} style={{ color: "var(--accent-orange)" }} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 650, color: "var(--text-primary)" }}>{service.title}</h3>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 14 }}>
                    {service.description}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {service.features.map((f) => (
                      <span key={f} className="badge" style={{ fontSize: 10 }}>{f}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
