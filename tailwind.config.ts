import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        franol: {
          cream: "#FDFBF7",
          sand: "#F5F0E8",
          warm: "#E8DFD0",
          text: "#2D2A26",
          muted: "#6B6560",
          accent: {
            blue: "#1E3A8A",
            red: "#DC2626",
            yellow: "#FBBF24",
          },
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["system-ui", "sans-serif"],
      },
      animation: {
        "scroll-left": "scroll-left 60s linear infinite",
        "scroll-right": "scroll-right 60s linear infinite",
        "fade-in": "fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both",
        "slide-up": "slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) both",
      },
      keyframes: {
        "scroll-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "scroll-right": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
