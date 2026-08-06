import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { Check, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Pricing — MatPilot",
  description: "MatPilot pricing plans for individuals, research labs, and organizations.",
};

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    description: "For students and researchers exploring the platform.",
    features: [
      "Up to 10 analyses per month",
      "XRD pattern processing & phase identification",
      "Standard export formats (PDF, TXT)",
      "Community support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Professional",
    price: "€500",
    period: "/ month",
    description: "For active research labs running regular characterization work.",
    features: [
      "1,000 analyses per month",
      "Full Rietveld refinement & manual refinement",
      "Raman, FTIR, and UV-Vis spectroscopy modules",
      "PDF, DOCX, TXT, and PPTX report exports",
      "Priority email support",
    ],
    cta: "Start Professional",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations requiring dedicated infrastructure and governance.",
    features: [
      "Unlimited analyses",
      "Single sign-on and team management",
      "On-premise or private cloud deployment",
      "Custom integrations and API access",
      "Dedicated scientific support",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", padding: "48px 32px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
            Simple, transparent <span style={{ color: "var(--accent-orange)" }}>pricing</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Start free and scale as your characterization workload grows. All plans include scientific-grade analysis tooling.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="card"
              style={{
                padding: 28,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                border: plan.highlight ? "1px solid var(--accent-orange)" : undefined,
              }}
            >
              {plan.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: -11,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "3px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--accent-orange)",
                    color: "white",
                  }}
                >
                  Most Popular
                </span>
              )}
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: plan.highlight ? "var(--accent-orange)" : "var(--text-muted)", marginBottom: 12 }}>
                {plan.name}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>{plan.description}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, flex: 1 }}>
                {plan.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-secondary)" }}>
                    <Check size={15} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
                    {feature}
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="button"
                style={{
                  textDecoration: "none",
                  justifyContent: "space-between",
                  background: plan.highlight ? "var(--accent-orange)" : "var(--surface-2)",
                  color: plan.highlight ? "white" : "var(--text-primary)",
                  borderColor: plan.highlight ? "transparent" : "var(--border-subtle)",
                }}
              >
                {plan.cta}
                <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>

        <section className="card" style={{ marginTop: 24, padding: 28, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Not sure which plan fits?</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
            All plans start with a free tier. Upgrade, downgrade, or cancel at any time.
          </p>
          <Link href="/about" className="button" style={{ textDecoration: "none" }}>
            Contact us
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
