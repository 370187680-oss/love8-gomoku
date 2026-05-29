/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        love8: {
          primary: '#E91E63',
          secondary: '#F48FB1',
          light: '#FCE4EC',
          dark: '#C2185B',
        },
      },
    },
  },
  plugins: [],
};
