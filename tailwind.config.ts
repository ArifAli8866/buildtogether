import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080A0F",
          900: "#0B0E14",
          800: "#11151D",
          700: "#171C27",
          600: "#232936",
          500: "#333B4A",
        },
        mist: {
          400: "#6B7280",
          300: "#9CA3AF",
          200: "#C7CBD1",
          100: "#E8EAED",
        },
        signal: {
          violet: "#7C6FF0",
          violetSoft: "#9C90FF",
          cyan: "#3FD3E0",
          green: "#3DDC84",
          amber: "#F5A623",
          coral: "#F0654F",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(124,111,240,0.08), transparent 60%)",
      },
      animation: {
        "pulse-slow": "pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
