import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
          display: "grid",
          placeItems: "center",
          marginBottom: 20,
          opacity: 0.5,
        }}
      >
        <Icon size={24} style={{ color: "var(--text-muted)" }} />
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: "var(--text-tertiary)",
          lineHeight: 1.6,
          maxWidth: 400,
          marginBottom: action ? 24 : 0,
        }}
      >
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="button primary"
          style={{ textDecoration: "none" }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
