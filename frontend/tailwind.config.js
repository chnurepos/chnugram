/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'Space Mono'", 'monospace'],
      },
      animation: {
        'typing': 'typing 1s infinite',
      }
    },
  },
  plugins: [],
}
