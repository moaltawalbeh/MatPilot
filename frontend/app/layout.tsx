import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "MatPilot — Materials Characterization Platform",
  description: "Comprehensive platform for materials characterization including XRD, Raman, FTIR, SEM, and more",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;450;500;550;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <Providers>{children}</Providers>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
