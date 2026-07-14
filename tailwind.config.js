/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warmBg: "#F8F8F6",
        charcoal: "#111111",
        secondaryText: "#5B5B5B",
        electricBlue: "#2563EB",
        acidGreen: "#84CC16",
        softOrange: "#F97316",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["General Sans", "Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
