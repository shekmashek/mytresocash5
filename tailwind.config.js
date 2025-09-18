// tailwind.config.js
import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: colors.blue,
        secondary: colors.slate,
        accent: colors.indigo,
        success: colors.emerald,
        danger: colors.rose,
        warning: colors.amber,
        info: colors.sky,
        
        background: colors.slate[50],
        surface: colors.white,
        
        'text-primary': colors.slate[800],
        'text-secondary': colors.slate[500],
      }
    }
  },
  plugins: [],
};
