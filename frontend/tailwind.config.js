/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          950: '#060A12',
          900: '#0B1120',
          850: '#0F172A',
          800: '#15213D',
        },
        surface: {
          card: '#0D1527',
          panel: '#101B33',
          hover: '#172545',
          border: '#1E2D4A',
          highlight: '#24375A',
        },
        cyan: {
          bright: '#22D3EE',
          glow: 'rgba(34, 211, 238, 0.15)',
        },
        emerald: {
          bright: '#10B981',
          glow: 'rgba(16, 185, 129, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'geo-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(30, 45, 74, 0.6)',
        'cyan-soft': '0 0 25px -5px rgba(6, 182, 212, 0.25)',
        'emerald-soft': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
      }
    },
  },
  plugins: [],
}
