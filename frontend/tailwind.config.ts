import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        switzer: ["var(--font-switzer)"],
        sans: ["var(--font-sans)"],
      },
      // Enhanced font sizes for better accessibility for older users
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.5' }],      // 14px (was 12px)
        'sm': ['1rem', { lineHeight: '1.6' }],          // 16px (was 14px)
        'base': ['1.125rem', { lineHeight: '1.75' }],   // 18px (was 16px)
        'lg': ['1.25rem', { lineHeight: '1.75' }],      // 20px (was 18px)
        'xl': ['1.5rem', { lineHeight: '1.75' }],       // 24px (was 20px)
        '2xl': ['1.75rem', { lineHeight: '2' }],        // 28px (was 24px)
        '3xl': ['2rem', { lineHeight: '2.25' }],        // 32px (was 30px)
        '4xl': ['2.5rem', { lineHeight: '2.5' }],       // 40px (was 36px)
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px
      },
    },
  },
  plugins: [],
} satisfies Config;
