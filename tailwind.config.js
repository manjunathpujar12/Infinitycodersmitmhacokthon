/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        background: '#F8F7F2',
        card: '#FFFFFF',
        sidebar: '#EEEFE8',
        border: '#E5E6DF',
        'border-subtle': '#ECEEE7',
        'text-main': '#333A34',
        'text-muted': '#68716A',
        'text-subtle': '#99A19B',
        sage: {
          50: '#F4F6F3',
          100: '#E7ECE5',
          200: '#D0DBCB',
          300: '#A9BC9F',
          400: '#859A7C',
          500: '#64765D',
          600: '#53624D',
          700: '#424E3D',
          800: '#313B2E',
          900: '#21271E',
        },
        terracotta: {
          50: '#FAF3EE',
          100: '#F5E7DF',
          200: '#E9CEBE',
          300: '#DCA98C',
          400: '#CE9A7A',
          500: '#C18B68',
          600: '#A97453',
          700: '#875A3F',
          800: '#64422E',
          900: '#422C1F',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'warm-sm': '0 1px 2px 0 rgba(51, 58, 52, 0.05)',
        'warm': '0 2px 4px -1px rgba(51, 58, 52, 0.06), 0 1px 2px -1px rgba(51, 58, 52, 0.04)',
        'warm-md': '0 4px 6px -1px rgba(51, 58, 52, 0.07), 0 2px 4px -2px rgba(51, 58, 52, 0.05)',
        'warm-lg': '0 10px 15px -3px rgba(51, 58, 52, 0.08), 0 4px 6px -4px rgba(51, 58, 52, 0.04)',
      }
    },
  },
  plugins: [],
}
