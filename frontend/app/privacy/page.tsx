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
      sections={[
        {
          heading: "1. Information We Collect",
          body: [
            "Account information: when you register, we collect your name, email address, and password (stored as a secure hash).",
            "Usage data: we collect information about how you interact with the platform, such as analysis runs, uploaded datasets, and report generations, to improve the service.",
            "Uploaded data: files you upload for analysis (XRD patterns, CIF structures, spectra) are stored to provide the analysis services you request.",
          ],
        },
        {
          heading: "2. How We Use Information",
          body: [
            "We use your information to operate, maintain, and improve the platform, including processing analyses, generating reports, and providing customer support.",
            "We may send transactional emails such as verification codes, password resets, and analysis completion notifications.",
            "We do not sell your personal data to third parties.",
          ],
        },
        {
          heading: "3. Data Storage and Security",
          body: [
            "Data is stored on secured infrastructure with encryption in transit and at rest.",
            "Passwords are hashed and never stored in plain text.",
            "You may request deletion of your account and associated data at any time.",
          ],
        },
        {
          heading: "4. Cookies",
          body: [
            "We use essential cookies to maintain your session and store preferences such as language and theme.",
            "See our Cookie Policy for full details.",
          ],
        },
        {
          heading: "5. Contact",
          body: [
            "For privacy-related inquiries, please contact us through the channels listed on the About page.",
          ],
        },
      ]}
    />
  );
}
