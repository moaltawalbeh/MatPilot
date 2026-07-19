"use client";

import {
  Search,
  FlaskConical,
  Target,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export type ScientificAction = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status?: "idle" | "running" | "completed" | "error";
  disabled?: boolean;
};

type ActionPanelProps = {
  actions: ScientificAction[];
  onActionClick: (actionId: string) => void;
  activeActionId?: string | null;
};

const STATUS_ICONS = {
  idle: null,
  running: <Loader2 size={13} className="spin" style={{ color: "var(--accent-orange)" }} />,
  completed: <CheckCircle2 size={13} style={{ color: "var(--success)" }} />,
  error: <AlertCircle size={13} style={{ color: "var(--error)" }} />,
};

export function ActionPanel({ actions, onActionClick, activeActionId }: ActionPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 10px" }}>
        Actions
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onActionClick(action.id)}
          disabled={action.disabled}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            border: "1px solid " + (activeActionId === action.id ? "var(--accent-orange-border)" : "transparent"),
            background: activeActionId === action.id ? "var(--accent-orange-bg)" : "transparent",
            color: action.disabled ? "var(--text-muted)" : "var(--text-primary)",
            cursor: action.disabled ? "not-allowed" : "pointer",
            textAlign: "left",
            width: "100%",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={(e) => {
            if (!action.disabled && activeActionId !== action.id) {
              e.currentTarget.style.background = "var(--bg-hover)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeActionId !== action.id) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span style={{ color: action.disabled ? "var(--text-muted)" : "var(--accent-orange)" }}>{action.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>{action.description}</div>
          </div>
          {action.status && STATUS_ICONS[action.status]}
        </button>
      ))}
    </div>
  );
}
