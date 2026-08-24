import { LegalPage } from "@/components/layout/legal-page";

export const metadata = {
  title: "Terms of Service — MatPilot",
  description: "MatPilot terms of service: the terms governing your use of the platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="August 6, 2026"
      intro="These Terms of Service govern your access to and use of the MatPilot materials characterization platform."
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: [
            "By creating an account or using the platform, you agree to be bound by these terms. If you do not agree, you may not use the service.",
          ],
        },
        {
          heading: "2. Use of the Service",
          body: [
            "You are responsible for the scientific data you upload and for ensuring you have the right to process it.",
            "You may not use the platform for unlawful purposes or to upload content that infringes the rights of others.",
            "The platform is provided for research, education, and professional analysis purposes.",
          ],
        },
        {
          heading: "3. Accounts",
          body: [
            "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.",
            "You must provide accurate account information, including a valid email address for verification.",
          ],
        },
        {
          heading: "4. Intellectual Property",
          body: [
            "MatPilot and its underlying software are provided under open-source principles. Your data and analysis results remain yours.",
          ],
        },
        {
          heading: "5. Disclaimer of Warranties",
          body: [
            "Scientific analysis tools produce results that should be interpreted by qualified researchers. The platform is provided 'as is' without warranties of any kind, and analysis results are not a substitute for professional scientific judgment.",
          ],
        },
        {
          heading: "6. Limitation of Liability",
          body: [
            "To the maximum extent permitted by law, MatPilot shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
          ],
        },
        {
          heading: "7. Changes to Terms",
          body: [
            "We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised terms.",
          ],
        },
        {
          heading: "8. Contact",
          body: [
            "Questions about these terms may be directed through the contact channels listed on the About page.",
          ],
        },
      ]}
    />
  );
}
