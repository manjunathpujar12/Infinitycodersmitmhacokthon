/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F7F2',
        cards: '#FFFFFF',
        sidebar: '#EEEFE8',
        primary: {
          DEFAULT: '#64765D',
          hover: '#52624D',
          light: '#EAF0E8',
          dark: '#3D4939'
        },
        sage: {
          DEFAULT: '#64765D',
          hover: '#52624D',
          light: '#EAF0E8',
          dark: '#3D4939'
        },
        secondary: {
          DEFAULT: '#C18B68',
          hover: '#AB7552',
          light: '#F8EFE9',
          dark: '#8C5635'
        },
        terracotta: {
          DEFAULT: '#C18B68',
          hover: '#AB7552',
          light: '#F8EFE9',
          dark: '#8C5635'
        },
        textPrimary: '#333A34',
        textMuted: '#68736A',
        borderMuted: '#E5E6DF',
        borderDark: '#D2D4CA',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        card: '0 4px 6px -1px rgba(51, 58, 52, 0.04), 0 2px 4px -2px rgba(51, 58, 52, 0.03)',
        elevated: '0 10px 15px -3px rgba(51, 58, 52, 0.07), 0 4px 6px -4px rgba(51, 58, 52, 0.05)',
      }
    },
  },
  plugins: [],
}

