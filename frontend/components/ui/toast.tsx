"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, X, Info, AlertTriangle } from "lucide-react";

type Toast = { id: string; title: string; message?: string; type: "success" | "error" | "info" | "warning" };
type ToastContextValue = { toast: (t: Omit<Toast, "id">) => void; dismiss: (id: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

const typeConfig = {
  success: { color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.1)", icon: Check },
  error: { color: "var(--error, #ef4444)", bg: "rgba(239, 68, 68, 0.1)", icon: AlertTriangle },
  info: { color: "var(--accent-cyan)", bg: "rgba(6, 182, 212, 0.1)", icon: Info },
  warning: { color: "var(--warning, #f59e0b)", bg: "rgba(245, 158, 11, 0.1)", icon: AlertTriangle },
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { ...t, id }]);
    const timer = setTimeout(() => dismiss(id), 5000);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380, pointerEvents: "none" }}>
        {toasts.map((t) => {
          const config = typeConfig[t.type];
          const Icon = config.icon;
          return (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", pointerEvents: "auto", animation: "slide-up 0.25s var(--ease-out) both" }}>
              <div style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", background: config.bg, display: "grid", placeItems: "center", flexShrink: 0, color: config.color, marginTop: 1 }}><Icon size={14} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: t.message ? 2 : 0 }}>{t.title}</div>
                {t.message && <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{t.message}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: "var(--text-muted)", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}><X size={12} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
