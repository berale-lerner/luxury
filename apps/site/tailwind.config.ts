import type { Config } from "tailwindcss";

const withAlpha = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: withAlpha("--ink"),
        abyss: withAlpha("--abyss"),
        deep: withAlpha("--deep"),
        jade: {
          DEFAULT: withAlpha("--jade"),
          soft: withAlpha("--jade-soft"),
        },
        sand: withAlpha("--sand"),
        parchment: withAlpha("--parchment"),
        clay: withAlpha("--clay"),
        ember: withAlpha("--ember"),
        gold: withAlpha("--gold"),
        stone: withAlpha("--stone"),
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        "10xl": ["9.5rem", { lineHeight: "0.86" }],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      backgroundImage: {
        "lake-fade":
          "linear-gradient(to bottom, rgb(var(--ink) / 0.72) 0%, rgb(var(--ink) / 0.18) 38%, rgb(var(--ink) / 0.55) 74%, rgb(var(--ink) / 0.94) 100%)",
        "ink-veil":
          "linear-gradient(to top, rgb(var(--ink) / 0.95) 0%, rgb(var(--ink) / 0.55) 45%, transparent 100%)",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "marquee-rev": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        marquee: "marquee 42s linear infinite",
        "marquee-rev": "marquee-rev 42s linear infinite",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        "1200": "1200ms",
        "1300": "1300ms",
        "1400": "1400ms",
        "1600": "1600ms",
      },
      container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '2rem',
        lg: '3rem',
        xl: '4rem',
        '2xl': '5rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
