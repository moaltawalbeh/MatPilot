"use client";

import {
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  BarChart3,
  FileText,
  Database,
  Settings,
  ChevronRight,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { LOCALES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav_dashboard" as const },
  { href: "/projects", icon: FolderKanban, labelKey: "nav_projects" as const },
  { href: "/experiments", icon: FlaskConical, labelKey: "nav_experiments" as const },
  { href: "/results", icon: BarChart3, labelKey: "nav_results" as const },
  { href: "/reports", icon: FileText, labelKey: "nav_reports" as const },
  { href: "/database", icon: Database, labelKey: "nav_database" as const },
  { href: "/settings", icon: Settings, labelKey: "nav_settings" as const },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale, dir } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return path === "/" || path === "/dashboard" || path.startsWith("/dashboard");
    return path === href || path.startsWith(href + "/");
  }, [path]);

  const breadcrumbs = path.split("/").filter(Boolean);

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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation Bar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "color-mix(in srgb, var(--bg-primary) 80%, transparent)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 52, gap: 32 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--accent-orange), var(--accent-orange-bright, #fb923c))",
              display: "grid", placeItems: "center",
              fontSize: 14, fontWeight: 800, color: "white",
            }}>M</div>
            <span style={{ fontSize: 16, fontWeight: 750, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>MatPilot</span>
          </Link>

          {/* Desktop Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }} className="nav-links-desktop">
            {mainNav.map(({ href, icon: Icon, labelKey }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: "var(--radius-sm)",
                  fontSize: 13, fontWeight: active ? 600 : 450,
                  color: active ? "var(--accent-orange)" : "var(--text-secondary)",
                  background: active ? "var(--accent-orange-bg)" : "transparent",
                  textDecoration: "none", transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}>
                  <Icon size={15} />
                  <span>{t[labelKey]}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Language Switcher */}
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

            {/* Launch Button */}
            <Link href="/dashboard" style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: "var(--radius-sm)",
              background: "var(--accent-orange)", color: "white",
              fontSize: 12, fontWeight: 600, textDecoration: "none",
              transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
              <Zap size={13} />
              {t.nav_launch}
            </Link>

            {/* Mobile Menu Toggle */}
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
      </nav>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="nav-mobile-drawer" style={{
          position: "fixed", top: 52, left: 0, right: 0, bottom: 0,
          background: "var(--bg-primary)", zIndex: 40,
          padding: 16, overflowY: "auto",
          display: "none",
        }}>
          {mainNav.map(({ href, icon: Icon, labelKey }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: "var(--radius-sm)",
                fontSize: 14, fontWeight: active ? 600 : 450,
                color: active ? "var(--accent-orange)" : "var(--text-primary)",
                background: active ? "var(--accent-orange-bg)" : "transparent",
                textDecoration: "none", marginBottom: 2,
              }}>
                <Icon size={18} />
                <span>{t[labelKey]}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Breadcrumb Bar */}
      {breadcrumbs.length > 0 && (
        <div style={{
          padding: "8px 24px", fontSize: 12, color: "var(--text-muted)",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>MatPilot</Link>
          {breadcrumbs.map((segment, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ChevronRight size={11} />
              <span style={{ textTransform: "capitalize", color: i === breadcrumbs.length - 1 ? "var(--text-primary)" : undefined }}>
                {segment.replace(/-/g, " ")}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
