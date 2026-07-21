import { TableSkeleton } from "@/components/ui/skeleton";

export default function ExperimentsLoading() {
  return (
    <div style={{ padding: "0 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
          Workspace
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Experiments</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Track and manage your characterization experiments.</p>
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
