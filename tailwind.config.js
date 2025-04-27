/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}", // Scan HTML and JS files in the root
    "./content.js",  // Scan the content script
    "./options.js"   // Scan the options script
  ],
  theme: {
    extend: {
      colors: {
        'bookmark-blue': '#007AFF', // Example Apple-like blue
        'dark-bg': '#1C1C1E',     // Example dark mode background
        'light-bg': '#F2F2F7',    // Example light mode background
        'hover-bg': 'rgba(120, 120, 128, 0.16)' // Example hover effect
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif']
      },
      spacing: {
        'icon-sm': '1rem',   // 16px
        'icon-md': '1.5rem', // 24px
        'icon-lg': '2rem',   // 32px
      },
      borderRadius: {
        'apple': '8px', // Common Apple corner radius
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
  darkMode: 'media', // Or 'class' if you prefer manual toggling
} 