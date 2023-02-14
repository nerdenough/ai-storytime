/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        book: ['Handlee', 'ui-serif', 'Georgia'],
      },
    },
  },
  plugins: [],
}
