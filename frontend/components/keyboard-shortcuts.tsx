"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type KeyboardShortcutsProps = {
  onSearchOpen: () => void;
  showHelp: boolean;
  onHelpClose: () => void;
};

const shortcuts = [
  { keys: ["Ctrl", "K"], label: "Open command palette" },
  { keys: ["Ctrl", "N"], label: "New project" },
  { keys: ["Ctrl", "U"], label: "Upload data" },
  { keys: ["Ctrl", "D"], label: "Go to dashboard" },
  { keys: ["Ctrl", "/"], label: "Show keyboard shortcuts" },
  { keys: ["Esc"], label: "Close modal / palette" },
];

export function KeyboardShortcuts({
  onSearchOpen,
  showHelp,
  onHelpClose,
}: KeyboardShortcutsProps) {
  const router = useRouter();

  const isMod = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const modKey = isMod ? "Cmd" : "Ctrl";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = isMod ? e.metaKey : e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        onSearchOpen();
      } else if (mod && e.key === "n") {
        e.preventDefault();
        router.push("/projects/new");
      } else if (mod && e.key === "u") {
        e.preventDefault();
        router.push("/upload");
      } else if (mod && e.key === "d") {
        e.preventDefault();
        router.push("/dashboard");
      } else if (e.key === "/" && !mod && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onHelpClose();
        // Toggle handled via showHelp prop inversion by parent
      } else if (e.key === "Escape" && showHelp) {
        e.preventDefault();
        onHelpClose();
      }
    },
    [onSearchOpen, onHelpClose, showHelp, router, isMod],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!showHelp) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 300,
        animation: "fade-in 0.15s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onHelpClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "fade-in-scale 0.2s var(--ease-out)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onHelpClose}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "8px 20px 20px" }}>
          {shortcuts.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {s.label}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    style={{
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 500,
                      minWidth: 24,
                      textAlign: "center",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
