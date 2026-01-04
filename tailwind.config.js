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
          50: '#eff0f9',
          100: '#dce0f3',
          200: '#b9c1e9',
          300: '#919edc',
          400: '#6a7ad0',
          500: '#485bc6', 
          600: '#02006c', // Base
          700: '#020058',
          800: '#010042',
          900: '#01002d',
        }
      }
    },
  },
  plugins: [],
}
