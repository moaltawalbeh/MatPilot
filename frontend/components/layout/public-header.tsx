"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { LOCALES } from "@/lib/i18n";
import { Sun, Moon, Globe, Menu, X, Zap } from "lucide-react";

const publicNav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
] as const;

export function PublicHeader() {
  const path = usePathname() ?? "";
  const { theme, toggle } = useTheme();
  const { locale, setLocale, dir } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    if (href === "/") return path === "/";
    return path === href || path.startsWith(href + "/");
  };

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
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "color-mix(in srgb, var(--bg-primary) 80%, transparent)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border-subtle)",
      padding: "0 32px",
    }}>
      <div style={{ display: "flex", alignItems: "center", height: 60, maxWidth: 1200, margin: "0 auto" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
            display: "grid", placeItems: "center",
            fontSize: 15, fontWeight: 800, color: "white",
          }}>M</div>
          <span style={{ fontSize: 17, fontWeight: 750, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>MatPilot</span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 48 }} className="nav-links-desktop">
          {publicNav.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: "var(--radius-sm)",
                fontSize: 13.5, fontWeight: active ? 600 : 450,
                color: active ? "var(--accent-orange)" : "var(--text-secondary)",
                background: active ? "var(--accent-orange-bg)" : "transparent",
                textDecoration: "none", transition: "all 0.15s",
              }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {/* Language */}
          <div ref={langRef} style={{ position: "relative" }}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)", background: "var(--surface-1)",
                color: "var(--text-secondary)", fontSize: 12, fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Globe size={14} />
              <span>{locale.toUpperCase()}</span>
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
                    fontSize: 13, fontWeight: locale === l.code ? 600 : 450,
                    textAlign: dir === "rtl" ? "right" : "left",
                  }}>
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{
              display: "grid", placeItems: "center",
              width: 32, height: 32, borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)", background: "var(--surface-1)",
              color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Launch CTA */}
          <Link href="/dashboard" style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 18px", borderRadius: "var(--radius-sm)",
            background: "var(--accent-orange)", color: "white",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
            <Zap size={14} />
            Launch Workspace
          </Link>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="nav-mobile-toggle"
            style={{
              display: "none", placeItems: "center",
              width: 32, height: 32, borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)", background: "var(--surface-1)",
              color: "var(--text-secondary)", cursor: "pointer",
            }}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="nav-mobile-drawer" style={{
          position: "fixed", top: 60, left: 0, right: 0, bottom: 0,
          background: "var(--bg-primary)", zIndex: 40, padding: 16, overflowY: "auto",
          display: "none",
        }}>
          {publicNav.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
              display: "block", padding: "14px", borderRadius: "var(--radius-sm)",
              fontSize: 15, fontWeight: isActive(href) ? 600 : 450,
              color: isActive(href) ? "var(--accent-orange)" : "var(--text-primary)",
              textDecoration: "none", marginBottom: 4,
            }}>
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: "40px 32px",
      maxWidth: 1200, margin: "0 auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, var(--accent-orange), #fb923c)",
              display: "grid", placeItems: "center",
              fontSize: 13, fontWeight: 800, color: "white",
            }}>M</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>MatPilot</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320, lineHeight: 1.6 }}>
            Scientific analysis platform for X-ray diffraction data processing and materials characterization.
          </p>
        </div>
        <div style={{ display: "flex", gap: 48 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Product</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href="/services" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>Services</Link>
              <Link href="/dashboard" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>Launch Platform</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Company</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href="/about" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>About</Link>
              <a href="https://github.com" style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}>GitHub</a>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 32, paddingTop: 16, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
        © 2026 MatPilot. Built with scientific rigor and open-source principles.
      </div>
    </footer>
  );
}
