/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0E1A",
        card: "#111827",
        elevated: "#1F2937",
        line: "#1F2937",
        brand: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
        },
        up: "#22C55E",
        down: "#EF4444",
        ink: {
          DEFAULT: "#F9FAFB",
          muted: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
