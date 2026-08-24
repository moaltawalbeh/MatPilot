import { PublicHeader, PublicFooter } from "@/components/layout/public-header";

type LegalSection = {
  heading: string;
  body: string[];
};

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 820, margin: "0 auto", padding: "48px 32px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>{title}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Last updated: {updated}</p>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 640, margin: "0 auto", lineHeight: 1.7 }}>{intro}</p>
        </div>

        {sections.map((section) => (
          <section className="card" style={{ marginBottom: 16, padding: 28 }} key={section.heading}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>{section.heading}</h2>
            {section.body.map((paragraph, i) => (
              <p key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)", marginBottom: i < section.body.length - 1 ? 12 : 0 }}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
      <PublicFooter />
    </div>
  );
}
