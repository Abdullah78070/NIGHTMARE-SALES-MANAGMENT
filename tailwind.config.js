
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
        barcode: ['"Libre Barcode 39"', 'cursive'],
      },
      colors: {
        night: {
          950: '#05070a',
          900: '#0f172a',
          800: '#1e293b',
        },
        brand: {
          red: '#7f1d1d',
          darkRed: '#450a0a',
        }
      }
    },
  },
  plugins: [],
}
