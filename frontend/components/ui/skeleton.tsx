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

export function StatsCardSkeleton() {
  return (
    <div className="card" style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "start" }}>
      <Skeleton style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton style={{ width: 60, height: 10, marginBottom: 8 }} />
        <Skeleton style={{ width: 40, height: 22 }} />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Skeleton style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ width: "60%", height: 12, marginBottom: 6 }} />
            <Skeleton style={{ width: "40%", height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton style={{ width: 80, height: 10, marginBottom: 8 }} />
          <Skeleton style={{ width: "100%", height: 36, borderRadius: "var(--radius-sm)" }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton style={{ width: 120, height: 14, marginBottom: 16 }} />
      <div style={{ position: "relative" }}>
        <Skeleton style={{ width: "100%", height: 200, borderRadius: "var(--radius-md)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ width: 30, height: 8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={{ padding: "0 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <Skeleton style={{ width: 80, height: 10, marginBottom: 8 }} />
        <Skeleton style={{ width: 220, height: 26, marginBottom: 8 }} />
        <Skeleton style={{ width: 340, height: 12 }} />
      </div>
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid three" style={{ marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <Skeleton style={{ width: 100, height: 14, marginBottom: 16 }} />
            <ListSkeleton items={3} />
          </div>
        ))}
      </div>
      <div className="grid three" style={{ marginBottom: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 20 }}>
            <Skeleton style={{ width: 100, height: 14, marginBottom: 16 }} />
            <ListSkeleton items={4} />
          </div>
        ))}
      </div>
    </div>
  );
}
