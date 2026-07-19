"use client";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ minHeight: 16, ...style }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton style={{ width: 60, height: 12, marginBottom: 12 }} />
      <Skeleton style={{ width: "70%", height: 18, marginBottom: 8 }} />
      <Skeleton style={{ width: "50%", height: 12 }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 16,
            padding: "12px 0",
            borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <Skeleton style={{ flex: 2, height: 12 }} />
          <Skeleton style={{ flex: 1, height: 12 }} />
          <Skeleton style={{ flex: 1, height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: "0 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <Skeleton style={{ width: 80, height: 10, marginBottom: 8 }} />
        <Skeleton style={{ width: 280, height: 26, marginBottom: 8 }} />
        <Skeleton style={{ width: 400, height: 12 }} />
      </div>
      <div className="grid three">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
