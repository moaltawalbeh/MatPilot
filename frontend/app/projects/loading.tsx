import { TableSkeleton } from "@/components/ui/skeleton";

export default function ProjectsLoading() {
  return (
    <div style={{ padding: "0 32px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
          Workspace
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Projects</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Manage your research projects and characterization work.</p>
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
