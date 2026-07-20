"use client";

import {
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  Beaker,
  Ruler,
  Cpu,
  FolderOpen,
  Download,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "MAIN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/experiments", label: "Experiments", icon: FlaskConical },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { href: "/samples", label: "Samples", icon: Beaker },
      { href: "/measurements", label: "Measurements", icon: Ruler },
      { href: "/structures", label: "Structures", icon: Cpu },
    ],
  },
  {
    title: "COLLABORATION",
    items: [
      { href: "/collections", label: "Collections", icon: FolderOpen },
      { href: "/downloads", label: "Downloads", icon: Download },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Shield },
    ],
  },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const path = usePathname() ?? "";

  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard")
        return path === "/" || path === "/dashboard" || path.startsWith("/dashboard");
      return path === href || path.startsWith(href + "/");
    },
    [path],
  );

  return (
    <aside
      style={{
        width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.2s var(--ease-out)",
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "12px 0" : "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          minHeight: 52,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-md)",
              background:
                "linear-gradient(135deg, var(--accent-orange), var(--accent-orange-bright, #fb923c))",
              display: "grid",
              placeItems: "center",
              fontSize: 14,
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            M
          </div>
          {!collapsed && (
            <span
              style={{
                fontSize: 16,
                fontWeight: 750,
                color: "var(--text-primary)",
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap",
              }}
            >
              MatPilot
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: collapsed ? "8px 0" : "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: collapsed ? 16 : 20,
        }}
      >
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <div
                style={{
                  padding: "0 12px",
                  marginBottom: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 10,
                      padding: collapsed ? "10px 0" : "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      textDecoration: "none",
                      color: active
                        ? "var(--accent-orange)"
                        : "var(--text-secondary)",
                      background: active
                        ? "var(--accent-orange-bg)"
                        : "transparent",
                      fontWeight: active ? 600 : 450,
                      fontSize: 13,
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                      minHeight: 36,
                    }}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Toggle Button */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: collapsed ? "8px 0" : "8px",
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-end",
        }}
      >
        <button
          onClick={onToggle}
          style={{
            display: "grid",
            placeItems: "center",
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-1)",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
