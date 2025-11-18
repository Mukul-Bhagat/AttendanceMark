/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f59f0a', // Gold/Amber brand color (used in both modes)
        // Light mode colors (White & Gold theme)
        'background-light': '#f8f7f5', // Off-white background
        'surface-light': '#ffffff', // White surfaces
        'text-primary-light': '#181511', // Dark text on light background
        'text-secondary-light': '#8a7b60', // Secondary text on light background
        'border-light': '#e6e2db', // Light borders
        // Dark mode colors (from attachment - dark brown/olive theme)
        'background-dark': '#221c10', // Dark brown/olive background
        'surface-dark': '#2a2212', // Dark surface cards
        'text-primary-dark': '#f8f7f5', // Light text on dark background
        'text-secondary-dark': '#a19887', // Secondary text on dark background
        'border-dark': '#403621', // Dark borders
      },
      fontFamily: {
        sans: ['Manrope', 'Hero New', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
      },
    },
  },
  plugins: [],
}

