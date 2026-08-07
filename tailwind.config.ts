import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        severity: {
          critical: "hsl(var(--severity-critical))",
          high: "hsl(var(--severity-high))",
          medium: "hsl(var(--severity-medium))",
          low: "hsl(var(--severity-low))",
        },
        state: {
          eligible: "hsl(var(--state-eligible))",
          paid: "hsl(var(--state-paid))",
          processing: "hsl(var(--state-processing))",
          ineligible: "hsl(var(--state-ineligible))",
          rejected: "hsl(var(--state-rejected))",
        },
      },
      fontFamily: {
        sans: ["Barlow", "Manrope", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        marker: ["Bebas Neue", "Sora", "system-ui", "sans-serif"],
        display: ["Sora", "-apple-system", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 8px)",
        sm: "calc(var(--radius) - 12px)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        glow: "var(--shadow-glow)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in-plain": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scale-in": { "0%": { transform: "scale(0.97)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
        "sheet-up": { "0%": { transform: "translateY(100%)" }, "100%": { transform: "translateY(0)" } },
        "float": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        "shimmer": { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        "pulse-ring": { "0%": { transform: "scale(0.9)", opacity: "0.7" }, "100%": { transform: "scale(1.6)", opacity: "0" } },
        "marquee": { "0%": { transform: "translate3d(0,0,0)" }, "100%": { transform: "translate3d(-50%,0,0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s cubic-bezier(0.22,1,0.36,1)",
        "fade-in-plain": "fade-in-plain 0.3s ease-out",
        "scale-in": "scale-in 0.28s cubic-bezier(0.22,1,0.36,1)",
        "sheet-up": "sheet-up 0.3s cubic-bezier(0.22,1,0.36,1)",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.215,0.61,0.355,1) infinite",
        "marquee": "marquee 42s linear infinite",

      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
