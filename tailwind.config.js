/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Teeco Brand Colors
        'gray-brand': '#2b2823',  // Dark olive/charcoal - primary text
        'mocha': '#787060',       // Olive/tan - secondary text
        'cream': '#e5e3da',       // Light beige - backgrounds
        'cream-dark': '#d8d6cd',  // Slightly darker cream
        
        // Teeco Teal (derived from website header)
        'teeco-teal': {
          DEFAULT: '#3d6b6b',
          light: '#4a7a7a',
          dark: '#2f5555',
        },
        
        // Legacy primary colors (keeping for compatibility)
        primary: {
          DEFAULT: "#3d6b6b",
          dark: "#2f5555",
          light: "#4a7a7a",
          50: "#f0f7f7",
          100: "#d9ebeb",
          200: "#b3d7d7",
          300: "#8dc3c3",
          400: "#67afaf",
          500: "#4a9a9a",
          600: "#3d6b6b",
          700: "#2f5555",
          800: "#234040",
          900: "#172a2a",
        },
        background: "#e5e3da",  // Cream
        surface: "#FFFFFF",
        foreground: "#2b2823",  // Gray brand
        muted: "#787060",       // Mocha
        border: "#d8d6cd",      // Cream dark
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      fontFamily: {
        'serif': ['Source Serif Pro', 'Georgia', 'serif'],
        'sans': ['Raleway', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
