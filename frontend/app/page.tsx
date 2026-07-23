"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Zap, ArrowRight, FlaskConical, Database, Target, BarChart3, FileText, FileBarChart, ChevronRight, Check, Globe, Sun, Moon, Waves, AudioLines, Microscope, Atom, ScanEye, Thermometer, Flame, CircleDot, Layers, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const FEATURES = [
  { icon: FileBarChart, titleKey: "feature_xrd" as const, descKey: "feature_xrd_desc" as const, color: "var(--accent-orange)" },
  { icon: Database, titleKey: "feature_reference" as const, descKey: "feature_reference_desc" as const, color: "var(--accent-cyan)" },
  { icon: FlaskConical, titleKey: "feature_phase_id" as const, descKey: "feature_phase_id_desc" as const, color: "var(--accent-emerald)" },
  { icon: Target, titleKey: "feature_rietveld" as const, descKey: "feature_rietveld_desc" as const, color: "var(--accent-violet)" },
  { icon: FileText, titleKey: "feature_reports" as const, descKey: "feature_reports_desc" as const, color: "var(--accent-rose)" },
  { icon: Sparkles, title: "AI Assistant", desc: "Intelligent assistant for materials science questions and result interpretation", color: "var(--accent-amber)" },
];

const WORKFLOW_STEPS = [
  { icon: "↑", labelKey: "wf_upload" as const },
  { icon: "🧹", labelKey: "wf_background" as const },
  { icon: "🔍", labelKey: "wf_peak" as const },
  { icon: "🧪", labelKey: "wf_phase" as const },
  { icon: "🌐", labelKey: "wf_cod" as const },
  { icon: "📐", labelKey: "wf_rietveld" as const },
  { icon: "📄", labelKey: "wf_report" as const },
];

const TECH = ["Python", "FastAPI", "Next.js", "React", "TypeScript", "NumPy", "SciPy", "pymatgen", "Groq AI", "PostgreSQL", "Materials Science"];

const TECHNIQUES = [
  { name: "X-ray Diffraction", icon: FileBarChart, color: "var(--accent-orange)", available: true, href: "/experiments" },
  { name: "Raman Spectroscopy", icon: Waves, color: "var(--accent-cyan)", available: false, href: "/characterization/raman" },
  { name: "FTIR Spectroscopy", icon: AudioLines, color: "var(--accent-emerald)", available: false, href: "/characterization/ftir" },
  { name: "UV-Vis Spectroscopy", icon: Sun, color: "var(--accent-amber)", available: false, href: "/characterization/uvvis" },
  { name: "SEM", icon: Microscope, color: "var(--accent-violet)", available: false, href: "/characterization/sem" },
  { name: "EDS/EDX", icon: Atom, color: "var(--accent-rose)", available: false, href: "/characterization/eds" },
  { name: "TEM", icon: ScanEye, color: "var(--accent-cyan)", available: false, href: "/characterization/tem" },
  { name: "XPS", icon: Target, color: "var(--accent-orange)", available: false, href: "/characterization/xps" },
  { name: "TGA", icon: Thermometer, color: "var(--accent-emerald)", available: false, href: "/characterization/tga" },
  { name: "DSC", icon: Flame, color: "var(--accent-rose)", available: false, href: "/characterization/dsc" },
  { name: "BET Surface Area", icon: Layers, color: "var(--accent-violet)", available: false, href: "/characterization/bet" },
  { name: "Dynamic Light Scattering", icon: CircleDot, color: "var(--accent-amber)", available: false, href: "/characterization/dls" },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale, dir } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* Top Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "color-mix(in srgb, var(--bg-primary) 85%, transparent)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 32px",
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
              display: "grid", placeItems: "center",
              fontSize: 14, fontWeight: 800, color: "white",
            }}>M</div>
            <span style={{ fontSize: 16, fontWeight: 750 }}>MatPilot</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 24 }}>
            <Link href="/services" style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "none", transition: "all 0.15s" }}>
              {t.nav_services}
            </Link>
            <Link href="/about" style={{ padding: "6px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", textDecoration: "none", transition: "all 0.15s" }}>
              {t.nav_about}
            </Link>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div ref={langRef} style={{ position: "relative" }}>
              <button onClick={() => setLangOpen(!langOpen)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)", background: "var(--surface-1)",
                color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
                <Globe size={14} /> {locale.toUpperCase()}
              </button>
              {langOpen && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 4,
                  background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)", padding: 4, minWidth: 140,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 100,
                }}>
                  {LOCALES.map((l) => (
                    <button key={l.code} onClick={() => { setLocale(l.code); setLangOpen(false); }} style={{
                      display: "block", width: "100%", padding: "8px 12px",
                      borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                      background: locale === l.code ? "var(--accent-orange-bg)" : "transparent",
                      color: locale === l.code ? "var(--accent-orange)" : "var(--text-primary)",
                      fontSize: 13, fontWeight: locale === l.code ? 600 : 450, textAlign: "left",
                    }}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggle} style={{
              display: "grid", placeItems: "center", width: 32, height: 32,
              borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)",
              background: "var(--surface-1)", color: "var(--text-secondary)", cursor: "pointer",
            }}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Link href="/dashboard" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: "var(--radius-sm)",
              background: "var(--accent-orange)", color: "white",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>
              <Zap size={14} /> {t.nav_launch}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        paddingTop: 140, paddingBottom: 80,
        textAlign: "center", padding: "140px 32px 80px",
        maxWidth: 800, margin: "0 auto",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, margin: "0 auto 24px",
          background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
          display: "grid", placeItems: "center",
          fontSize: 30, fontWeight: 800, color: "white",
          boxShadow: "0 8px 32px rgba(249,115,22,0.3)",
        }}>M</div>
        <h1 style={{
          fontSize: 56, fontWeight: 800, letterSpacing: "-1.5px",
          lineHeight: 1.1, marginBottom: 16,
          background: "linear-gradient(135deg, var(--text-primary) 0%, var(--accent-orange) 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>{t.landing_title}</h1>
        <p style={{
          fontSize: 20, color: "var(--text-secondary)", lineHeight: 1.5,
          marginBottom: 8, fontWeight: 400,
        }}>{t.landing_subtitle}</p>
        <p style={{
          fontSize: 14, color: "var(--text-muted)", marginBottom: 40,
        }}>{t.landing_developer}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: "var(--radius-md)",
            background: "var(--accent-orange)", color: "white",
            fontSize: 15, fontWeight: 650, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
            transition: "all 0.2s",
          }}>
            {t.landing_launch} <ArrowRight size={16} />
          </Link>
          <a href="#features" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)", background: "var(--surface-1)",
            color: "var(--text-primary)", fontSize: 15, fontWeight: 550,
            textDecoration: "none", transition: "all 0.2s",
          }}>
            {t.landing_learn_more}
          </a>
        </div>
      </section>

      {/* What is MatPilot */}
      <section style={{ padding: "60px 32px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 750, marginBottom: 16, letterSpacing: "-0.5px" }}>{t.landing_what_is}</h2>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 700, margin: "0 auto" }}>
          {t.landing_what_is_desc}
        </p>
      </section>

      {/* Workflow */}
      <section style={{ padding: "60px 32px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 750, textAlign: "center", marginBottom: 40, letterSpacing: "-0.5px" }}>{t.landing_workflow_title}</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "16px 14px", borderRadius: "var(--radius-md)",
                background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
                minWidth: 110, textAlign: "center",
              }}>
                <div style={{ fontSize: 22 }}>{step.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{t[step.labelKey]}</div>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <ChevronRight size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Characterization Techniques */}
      <section style={{ padding: "60px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 750, textAlign: "center", marginBottom: 12, letterSpacing: "-0.5px" }}>
          Supported Characterization Techniques
        </h2>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", textAlign: "center", marginBottom: 40, maxWidth: 600, margin: "0 auto 40px" }}>
          MatPilot is expanding to support multiple materials characterization methods. XRD is fully implemented, with more techniques coming soon.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {TECHNIQUES.map((tech) => (
            <Link key={tech.name} href={tech.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: "20px 12px", borderRadius: "var(--radius-md)",
              background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
              textDecoration: "none", color: "inherit", transition: "all 0.2s",
              position: "relative",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = tech.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: "var(--radius-md)",
                background: `${tech.color}15`, display: "grid", placeItems: "center",
              }}>
                <tech.icon size={20} style={{ color: tech.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>{tech.name}</span>
              {tech.available ? (
                <span className="badge good" style={{ fontSize: 9 }}>Available</span>
              ) : (
                <span className="badge" style={{ fontSize: 9, color: "var(--text-muted)" }}>Coming Soon</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "60px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 32, fontWeight: 750, textAlign: "center", marginBottom: 40, letterSpacing: "-0.5px" }}>{t.landing_features_title}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              padding: 24, borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
              transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: `${f.color}15`, display: "grid", placeItems: "center", marginBottom: 14 }}>
                <f.icon size={20} style={{ color: f.color }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 650, marginBottom: 6 }}>{("titleKey" in f && f.titleKey) ? t[f.titleKey] : ("title" in f ? (f as any).title : "")}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{("descKey" in f && f.descKey) ? t[f.descKey] : ("desc" in f ? (f as any).desc : "")}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology */}
      <section style={{ padding: "60px 32px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 750, marginBottom: 24, letterSpacing: "-0.5px" }}>{t.landing_tech_title}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {TECH.map((tech) => (
            <span key={tech} style={{
              padding: "8px 18px", borderRadius: 20,
              background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
              fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
            }}>{tech}</span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 32px 80px", textAlign: "center" }}>
        <div style={{
          maxWidth: 600, margin: "0 auto", padding: 48,
          borderRadius: "var(--radius-xl)",
          background: "linear-gradient(135deg, var(--accent-orange-bg, rgba(249,115,22,0.08)), var(--surface-1))",
          border: "1px solid var(--border-subtle)",
        }}>
          <h2 style={{ fontSize: 26, fontWeight: 750, marginBottom: 12 }}>Ready to characterize your materials?</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>Launch your workspace and start comprehensive materials characterization.</p>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 32px", borderRadius: "var(--radius-md)",
            background: "var(--accent-orange)", color: "white",
            fontSize: 15, fontWeight: 650, textDecoration: "none",
            boxShadow: "0 4px 16px rgba(249,115,22,0.3)",
          }}>
            <Zap size={16} /> {t.landing_launch}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "24px 32px", borderTop: "1px solid var(--border-subtle)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: "var(--text-muted)", maxWidth: 1100, margin: "0 auto",
        flexWrap: "wrap", gap: 12,
      }}>
        <span>{t.landing_footer_copy}</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span>{t.landing_footer_version}</span>
          <a href="https://github.com/Altawalbeh" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-orange)", textDecoration: "none" }}>GitHub</a>
        </div>
      </footer>
    </div>
  );
}
