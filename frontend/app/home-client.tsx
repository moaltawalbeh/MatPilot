"use client";

import React from "react";
import Script from "next/script";

type Props = {
  styles: string;
  html: string;
  script: string;
};

const TAILWIND_CONFIG = `tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        matDark: '#08090A',
        matSurface: '#0F1113',
        matElevated: '#16181B',
        matOrange: '#FF6A2C',
        matOrangeLight: '#FF8A50',
        matOrangeDark: '#C2451A',
        matBlue: '#3E8EFF',
        matBlueDark: '#1B3A66',
        matBorder: '#2A2C2F',
        matTextMuted: '#B8BCC2',
        matTextDim: '#6E7278'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  }
}`;

export default function HomeClient({ styles, html, script }: Props) {
  const pageScript = script
    .replace(
      /window\.onload\s*=\s*function\(\)\s*\{([\s\S]*)\}\s*;?\s*$/,
      "(function(){$1})();"
    );

  return (
    <>
      <Script
        src="https://cdn.tailwindcss.com"
        strategy="beforeInteractive"
      />
      <Script
        id="tailwind-config"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: TAILWIND_CONFIG }}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"
        strategy="beforeInteractive"
      />

      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />

      <Script
        id="page-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: pageScript }}
      />
    </>
  );
}
