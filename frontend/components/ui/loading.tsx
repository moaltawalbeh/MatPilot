export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        border: "2px solid var(--border-subtle)",
        borderTopColor: "var(--accent-orange)",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}

export function LoadingBar() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 9999,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: "40%",
          height: "100%",
          background: "var(--accent-orange)",
          borderRadius: 2,
          animation: "progress-indeterminate 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
      <Spinner size={14} />
      {text && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{text}</span>}
    </div>
  );
}

export function ButtonSpinner() {
  return <Spinner size={14} />;
}
