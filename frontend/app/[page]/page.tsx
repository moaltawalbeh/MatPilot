import { Page } from "@/components/ui/page";
import { Bot, CircleHelp, CreditCard, Settings, ShieldCheck, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

const pages: { [key: string]: { eyebrow: string; title: string; description: string; icon: typeof Settings; items: [string, string][] } } = {
  settings: {
    eyebrow: "Workspace configuration",
    title: "Settings",
    description: "Manage laboratory defaults and analysis workflows.",
    icon: Settings,
    items: [
      ["Analysis defaults", "Cu Kα radiation · 1.541874 Å"],
      ["Data retention", "Raw files retained for 5 years"],
      ["Notifications", "Analysis completions and exports"],
    ],
  },
  profile: {
    eyebrow: "Account",
    title: "Profile",
    description: "Your scientific identity and preferences.",
    icon: UserRound,
    items: [
      ["Dr. Maya Chen", "Principal materials scientist"],
      ["Organization", "Acme Materials Lab"],
      ["Authentication", "Single sign-on enabled"],
    ],
  },
  subscription: {
    eyebrow: "Billing",
    title: "Subscription",
    description: "Manage your team plan, usage, and invoices.",
    icon: CreditCard,
    items: [
      ["Professional plan", "€5,000 / year · Renews 14 July 2027"],
      ["Usage this month", "248 of 1,000 analyses"],
      ["Payment method", "Visa ending in 4242"],
    ],
  },
  help: {
    eyebrow: "Support",
    title: "Help & support",
    description: "Documentation and expert support for your workflow.",
    icon: CircleHelp,
    items: [
      ["Getting started", "Upload, validate, and analyze an XRD dataset"],
      ["Scientific methods", "Peak fitting and phase identification"],
      ["Contact support", "Response within one business day"],
    ],
  },
  assistant: {
    eyebrow: "Copilot",
    title: "AI Assistant",
    description: "A scientific collaborator grounded in your project context.",
    icon: Bot,
    items: [
      ["Interpret patterns", "Ask about peaks, phases, and residuals"],
      ["Explain methods", "Get clear scientific explanations"],
      ["Recommend next steps", "Turn observations into a defensible workflow"],
    ],
  },
};

export default async function AccountPage({ params }: { params: Promise<{ page: string }> }) {
  const data = pages[(await params).page];
  if (!data) notFound();
  const Icon = data.icon;
  return (
    <Page eyebrow={data.eyebrow} title={data.title} description={data.description}>
      <div className="grid two">
        <section className="card" style={{ padding: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--accent-orange-bg)", display: "grid", placeItems: "center", marginBottom: 16 }}>
            <Icon size={18} style={{ color: "var(--accent-orange)" }} />
          </div>
          {data.items.map(([a, b]) => (
            <div style={{ padding: "14px 0", borderTop: "1px solid var(--border-subtle)" }} key={a}>
              <strong style={{ fontSize: 14 }}>{a}</strong>
              <div className="muted" style={{ marginTop: 4 }}>{b}</div>
            </div>
          ))}
        </section>
        <section className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {data.title === "AI Assistant" ? "Start a scientific conversation" : "Workspace access"}
          </h2>
          <p className="muted" style={{ lineHeight: 1.6 }}>
            Your workspace is protected with organization-level controls and audit-ready project history.
          </p>
          <button className="button primary" style={{ marginTop: 20 }} onClick={() => window.location.href = "/settings"}>
            <ShieldCheck size={15} /> Manage access
          </button>
        </section>
      </div>
    </Page>
  );
}
