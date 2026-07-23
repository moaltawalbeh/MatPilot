import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        matDark: "#08090A",
        matSurface: "#0F1113",
        matElevated: "#16181B",
        matOrange: "#FF6A2C",
        matOrangeLight: "#FF8A50",
        matOrangeDark: "#C2451A",
        matBlue: "#3E8EFF",
        matBlueDark: "#1B3A66",
        matBorder: "#2A2C2F",
        matTextMuted: "#B8BCC2",
        matTextDim: "#6E7278",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
