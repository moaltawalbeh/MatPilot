import { LegalPage } from "@/components/layout/legal-page";

export const metadata = {
  title: "Privacy Policy — MatPilot",
  description: "MatPilot privacy policy: how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="August 6, 2026"
      intro="This Privacy Policy explains how MatPilot collects, uses, and protects information when you use our materials characterization platform."
    >
      <h2>1. Information We Collect</h2>
      <p>
        We collect information you provide directly to us when creating an account, uploading experimental datasets,
        or communicating with our support team.
      </p>

      <h2>2. Use of Scientific Data</h2>
      <p>
        Your uploaded diffraction patterns, spectra, and metadata are owned by you. MatPilot uses your data solely to execute requested analysis tasks, generate reports, and improve your user experience.
      </p>

      <h2>3. Data Protection</h2>
      <p>
        We implement industry-standard encryption for data at rest and in transit.
      </p>

      <h2>4. Contact Us</h2>
      <p>
        If you have questions about this privacy policy, please contact privacy@matpilot.site.
      </p>
    </LegalPage>
  );
}
