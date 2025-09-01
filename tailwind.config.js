/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html", "./src/**/*.{js,ts}"],
  theme: {
    extend: {
      colors: {
        'pong-green': '#00ff00',
        'pong-dark': '#0a0a0a',
        'pong-gray': '#1a1a1a',
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'monospace'],
      }
    },
  },
  plugins: [],
}
