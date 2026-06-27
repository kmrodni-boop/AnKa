/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nortronik: {
          red: '#520000',
          dark: '#3a0000',
          light: '#8a4a4a',
        },
      },
    },
  },
  plugins: [],
}
