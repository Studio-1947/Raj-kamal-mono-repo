import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        switzer: ["var(--font-switzer)"],
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
