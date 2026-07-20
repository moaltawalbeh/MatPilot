"use client";

import { Search, Sun, Moon, Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { LOCALES } from "@/lib/i18n";
import { NotificationBell } from "@/components/notification-bell";
import Link from "next/link";

type Breadcrumb = {
  label: string;
  href?: string;
};

type TopbarProps = {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  onSearchOpen?: () => void;
  onToggleSidebar?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
};

export function Topbar({ title, breadcrumbs, onSearchOpen }: TopbarProps) {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background:
          "color-mix(in srgb, var(--bg-primary) 80%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0 24px",
        height: "var(--topbar-height)",
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Left: Title + Breadcrumbs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flex: 1,
        }}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {breadcrumbs.map((crumb, i) => (
              <span
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                {i > 0 && (
                  <span style={{ color: "var(--text-muted)" }}>/</span>
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    style={{
                      color: "var(--text-muted)",
                      textDecoration: "none",
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Center: Search */}
      <button
        onClick={onSearchOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-1)",
          color: "var(--text-tertiary)",
          fontSize: 12,
          cursor: "pointer",
          transition: "all 0.15s",
          minWidth: 200,
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Search size={13} />
          <span>Search...</span>
        </span>
        <kbd
          style={{
            fontSize: 10,
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            display: "grid",
            placeItems: "center",
            width: 32,
            height: 32,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-1)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Language Selector */}
        <div ref={langRef} style={{ position: "relative" }}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--surface-1)",
              color: "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <Globe size={14} />
            <span>{locale.toUpperCase()}</span>
          </button>
          {langOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: 4,
                minWidth: 140,
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                zIndex: 100,
              }}
            >
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLocale(l.code);
                    setLangOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    cursor: "pointer",
                    background:
                      locale === l.code
                        ? "var(--accent-orange-bg)"
                        : "transparent",
                    color:
                      locale === l.code
                        ? "var(--accent-orange)"
                        : "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: locale === l.code ? 600 : 450,
                    textAlign: "left",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <NotificationBell count={3} />
      </div>
    </header>
  );
}
