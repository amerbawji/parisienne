/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8e6',
          100: '#ffebb3',
          200: '#ffdf80',
          300: '#ffd24d',
          400: '#ffc61a',
          500: '#ffb03b', // Base
          600: '#e69000',
          700: '#b37000',
          800: '#805000',
          900: '#4d3000',
        }
      }
    },
  },
  plugins: [],
}
