/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#060a13',
          900: '#0a101d',
          800: '#0f1829',
          700: '#162238',
          600: '#1e2f4b',
          500: '#2b4065',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.35), 0 8px 30px -8px rgba(59,130,246,0.45)',
      },
    },
  },
  plugins: [],
};
