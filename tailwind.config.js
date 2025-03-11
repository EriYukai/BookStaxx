/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './src/**/*.{js,html}'
  ],
  theme: {
    extend: {
      colors: {
        'bookmark-blue': '#0077ED',
        'bookmark-dark': '#333333',
        'bookmark-light': '#f1f3f4',
        'bookmark-hover': '#005BBB',
        'apple-gray': {
          50: '#F9F9F9',
          100: '#F2F2F2',
          200: '#E6E6E6',
          300: '#D5D5D5',
          400: '#B0B0B0',
          500: '#8C8C8C',
          600: '#6E6E6E',
          700: '#4F4F4F',
          800: '#333333',
          900: '#1A1A1A'
        },
        'apple-blue': {
          500: '#0077ED',
          600: '#005BBB',
          700: '#004A9E'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      spacing: {
        'bookmark-icon-sm': '16px',
        'bookmark-icon-md': '24px',
        'bookmark-icon-lg': '32px'
      },
      boxShadow: {
        'bookmark': '0 2px 5px rgba(0, 0, 0, 0.1)',
        'bookmark-hover': '0 4px 8px rgba(0, 0, 0, 0.15)',
        'apple': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'apple-hover': '0 3px 10px rgba(0, 0, 0, 0.12)',
        'apple-btn': '0 2px 5px rgba(0, 0, 0, 0.15)',
        'apple-card': '0 4px 12px rgba(0, 0, 0, 0.08)'
      },
      zIndex: {
        'max': '2147483647'
      },
      borderRadius: {
        'apple': '10px'
      },
      animation: {
        'apple-fade-in': 'appleFadeIn 0.3s ease-out forwards',
        'apple-slide-up': 'appleSlideUp 0.3s ease-out forwards',
        'apple-slide-down': 'appleSlideDown 0.3s ease-out forwards',
        'apple-slide-left': 'appleSlideLeft 0.3s ease-out forwards',
        'apple-slide-right': 'appleSlideRight 0.3s ease-out forwards',
        'apple-scale': 'appleScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'apple-bounce': 'appleBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      keyframes: {
        appleFadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        appleSlideUp: {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        appleSlideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        appleSlideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 }
        },
        appleSlideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 }
        },
        appleScale: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        },
        appleBounce: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '75%': { transform: 'scale(0.98)' },
          '100%': { transform: 'scale(1)' }
        }
      },
      backdropBlur: {
        'apple': '20px'
      },
      backgroundOpacity: {
        '15': '0.15',
        '85': '0.85',
      },
    },
  },
  darkMode: 'media',
  plugins: []
} 