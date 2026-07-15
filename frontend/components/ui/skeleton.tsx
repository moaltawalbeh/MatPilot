"use client";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(90deg, #1a2636 25%, #263545 50%, #1a2636 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: 6,
        minHeight: 16,
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton style={{ width: 60, height: 14, marginBottom: 12 }} />
      <Skeleton style={{ width: "70%", height: 20, marginBottom: 8 }} />
      <Skeleton style={{ width: "50%", height: 14 }} />
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
            borderTop: i > 0 ? "1px solid #263545" : "none",
          }}
        >
          <Skeleton style={{ flex: 2, height: 14 }} />
          <Skeleton style={{ flex: 1, height: 14 }} />
          <Skeleton style={{ flex: 1, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div style={{ padding: "0 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <Skeleton style={{ width: 100, height: 12, marginBottom: 8 }} />
        <Skeleton style={{ width: 300, height: 28, marginBottom: 8 }} />
        <Skeleton style={{ width: 450, height: 14 }} />
      </div>
      <div className="grid three">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
