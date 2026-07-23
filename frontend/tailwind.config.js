/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#183b42',
        slate: {
          health: '#64748b',
        },
        aqua: {
          DEFAULT: '#21888c',
          deep: '#176f73',
          soft: '#e8f7f5',
        },
        mint: {
          DEFAULT: '#35b6af',
          soft: '#dcf6ef',
        },
        corp: {
          blue: '#2f6fed',
          soft: '#e8f0ff',
        },
      },
      fontFamily: {
        display: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
        body: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px rgba(24, 59, 66, 0.12)',
      },
    },
  },
  plugins: [],
};
