"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Atom } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-lg)",
            background: "var(--accent-orange-bg)",
            border: "1px solid var(--accent-orange-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Atom size={24} style={{ color: "var(--accent-orange)" }} className="animate-pulse" />
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading MatPilot...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
