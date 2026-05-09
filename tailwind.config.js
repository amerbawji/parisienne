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
          50: '#e8ecf2',
          100: '#c5cfe0',
          200: '#9aafc9',
          300: '#6f8fb2',
          400: '#4a729f',
          500: '#25568c',
          600: '#0c2345',
          700: '#091c38',
          800: '#06142a',
          900: '#030d1c',
        },
        secondary: {
          50: '#fdf8ee',
          100: '#faefd4',
          200: '#f7e3b0',
          300: '#f3d68c',
          400: '#efc98b',
          500: '#e9b85e',
          600: '#d49c3a',
          700: '#a87a2d',
          800: '#7c5920',
          900: '#503913',
        },
      }
    },
  },
  plugins: [],
}
