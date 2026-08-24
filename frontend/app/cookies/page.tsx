import { LegalPage } from "@/components/layout/legal-page";

export const metadata = {
  title: "Cookie Policy — MatPilot",
  description: "MatPilot cookie policy: how we use cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="August 6, 2026"
      intro="This Cookie Policy explains how MatPilot uses cookies and similar technologies to keep the platform working and remember your preferences."
      sections={[
        {
          heading: "1. What Are Cookies",
          body: [
            "Cookies are small text files stored on your device by your web browser. They allow the platform to remember your session and preferences between visits.",
          ],
        },
        {
          heading: "2. Cookies We Use",
          body: [
            "Essential cookies: required for authentication and keeping you signed in while you work.",
            "Preference cookies: remember your language (matpilot-locale) and theme selection.",
          ],
        },
        {
          heading: "3. Managing Cookies",
          body: [
            "Most browsers let you control or delete cookies through their settings. Blocking essential cookies may prevent the platform from working correctly.",
          ],
        },
        {
          heading: "4. Contact",
          body: [
            "Questions about this cookie policy may be directed through the contact channels listed on the About page.",
          ],
        },
      ]}
    />
  );
}
