"use client";

import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { useLanguage } from "@/components/language-provider";
import { FlaskConical, Target, BookOpen, Code2, Mail, ExternalLink, GraduationCap, Microscope } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "48px 32px", width: "100%" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
            About <span style={{ color: "var(--accent-orange)" }}>MatPilot</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
            A scientific platform for modern materials characterization through X-ray diffraction analysis.
          </p>
        </div>

        {/* Developer Profile */}
        <section className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 0, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 280px", minHeight: 320, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src="/developer-profile.png"
                alt="Mohammad Altawalbeh"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const fallback = document.createElement("div");
                    fallback.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:320px;";
                    fallback.innerHTML = '<div style="width:120px;height:120px;border-radius:50%;background:var(--accent-orange-bg);display:grid;place-items:center;margin-bottom:16px"><span style="font-size:48px;font-weight:700;color:var(--accent-orange)">MA</span></div><span style="font-size:14;font-weight:600;color:var(--text-secondary)">Mohammad Altawalbeh</span>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            <div style={{ flex: 1, padding: 32, minWidth: 300 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", marginBottom: 8 }}>Mohammad Altawalbeh</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <span className="badge info">Developer & Founder</span>
                <span className="badge indigo">Materials Chemist</span>
                <span className="badge" style={{ background: "var(--accent-violet-bg)", color: "var(--accent-violet)" }}>Materials Science Researcher</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 16 }}>
                Mohammad Altawalbeh is a Materials Chemist and Materials Science Researcher with deep expertise in X-ray diffraction analysis, crystallography, and computational materials characterization. He developed MatPilot to provide the scientific community with an accessible, open platform for advanced XRD analysis.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 20 }}>
                His research interests span the synthesis and characterization of advanced materials, powder diffraction methods, structure-property relationships, and the development of computational tools for materials science.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: Microscope, label: "Materials Synthesis & Characterization" },
                  { icon: FlaskConical, label: "X-ray Diffraction & Crystallography" },
                  { icon: BookOpen, label: "Computational Materials Science" },
                  { icon: GraduationCap, label: "Science Education & Open Tools" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
                    <item.icon size={14} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Target size={20} style={{ color: "var(--accent-orange)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 650 }}>Mission</h2>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", maxWidth: 700 }}>
            To democratize advanced crystallographic analysis by providing researchers, educators, and students with an accessible, powerful, and open platform for X-ray diffraction data processing and interpretation. MatPilot aims to bridge the gap between complex analytical software and the growing needs of the materials science community.
          </p>
        </section>

        {/* MatPilot Story */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <BookOpen size={20} style={{ color: "var(--accent-orange)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 650 }}>The MatPilot Story</h2>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 12 }}>
            MatPilot was born from the need for a modern, integrated scientific platform that combines XRD data processing, phase identification, and Rietveld refinement into a single accessible workflow. Traditional crystallographic software often requires extensive training, command-line expertise, and expensive licenses.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)" }}>
            By combining a clean web-based interface with a powerful Python scientific backend, MatPilot makes advanced XRD analysis available to anyone with a web browser. The platform supports multiple input formats, integrates with crystallographic databases, and produces publication-quality results.
          </p>
        </section>

        {/* Technology Stack */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Code2 size={20} style={{ color: "var(--accent-orange)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 650 }}>Technology Stack</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { category: "Frontend", items: "Next.js 15, React 19, TypeScript, Recharts" },
              { category: "Backend", items: "Python 3.13, FastAPI, Pydantic" },
              { category: "Science", items: "NumPy, SciPy, Matplotlib, pymatgen" },
              { category: "Database", items: "COD (Crystallography Open Database)" },
              { category: "Analysis", items: "Rietveld Refinement, Phase ID, Peak Detection" },
              { category: "Reports", items: "ReportLab, Publication-quality PDF" },
            ].map((stack) => (
              <div key={stack.category} style={{ background: "var(--surface-1)", borderRadius: "var(--radius-md)", padding: "14px 16px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-orange)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{stack.category}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{stack.items}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Mail size={20} style={{ color: "var(--accent-orange)" }} />
            <h2 style={{ fontSize: 17, fontWeight: 650 }}>Contact</h2>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: 16 }}>
            For inquiries about MatPilot, collaborations, or scientific discussions, please reach out through the channels below.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="https://github.com/Altawalbeh" className="button" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <ExternalLink size={14} /> GitHub
            </a>
            <a href="mailto:mohammad.altawalbeh@example.com" className="button" style={{ textDecoration: "none" }}>
              <Mail size={14} /> Contact Developer
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
