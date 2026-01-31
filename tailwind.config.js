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
        // Teeco Brand Colors (ONLY these 5 colors)
        'teeco-black': '#000000',    // Black - strong accents, headers
        'teeco-gray': '#2b2823',     // Gray - primary text, dark backgrounds
        'teeco-mocha': '#787060',    // Mocha - secondary text, muted elements
        'teeco-cream': '#e5e3da',    // Cream - primary backgrounds
        'teeco-white': '#ffffff',    // White - cards, surfaces
        
        // Semantic aliases for easier usage
        background: '#e5e3da',       // Cream
        surface: '#ffffff',          // White
        foreground: '#2b2823',       // Gray
        muted: '#787060',            // Mocha
        border: '#d8d6cd',           // Slightly darker cream for borders
        accent: '#2b2823',           // Gray for accents (buttons, links)
        
        // Grade colors (kept for scoring displays - these are functional, not brand)
        grade: {
          'a-plus': '#2b2823',       // Gray for A+ (premium feel)
          'a': '#3d5c3d',            // Muted green
          'b-plus': '#4a6b4a',       // Lighter muted green
          'b': '#787060',            // Mocha
          'c': '#8a7a60',            // Warmer mocha
          'd': '#9a6a50',            // Muted terracotta
          'f': '#8a5040',            // Muted rust
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.12)',
        'elevated': '0 8px 24px -4px rgb(0 0 0 / 0.12)',
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontSize: {
        'xxs': '0.625rem',
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      fontFamily: {
        'serif': ['Source Serif Pro', 'Georgia', 'Cambria', 'serif'],
        'sans': ['Raleway', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
