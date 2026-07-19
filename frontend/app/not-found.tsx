import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <main className="content" style={{ textAlign: "center", paddingTop: 120 }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "-2px", marginBottom: 8 }}>404</div>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Lost in the lattice</p>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Page not found</h1>
        <p className="muted" style={{ marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
          The requested resource could not be located. It may have been moved or is no longer available.
        </p>
        <Link className="button primary" href="/dashboard" style={{ textDecoration: "none" }}>
          Return to workspace
        </Link>
      </main>
    </AppShell>
  );
}
