/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1e293b',
        slate: {
          health: '#64748b',
        },
        // Brand VitaLink (logo)
        vita: {
          DEFAULT: '#0077B6',
          deep: '#023E8A',
          soft: '#E8F4FA',
        },
        link: {
          DEFAULT: '#00B4D8',
          soft: '#E0F7FC',
          bright: '#48CAE4',
        },
        // Aliases legados → brand (mantém classes aqua/mint existentes)
        aqua: {
          DEFAULT: '#00B4D8',
          deep: '#0077B6',
          soft: '#E8F7FC',
        },
        mint: {
          DEFAULT: '#48CAE4',
          soft: '#DFF6FB',
        },
        corp: {
          blue: '#0077B6',
          soft: '#E8F4FA',
        },
      },
      fontFamily: {
        display: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
        body: ['"Source Sans 3"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 60px rgba(2, 62, 138, 0.12)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
      },
    },
  },
  plugins: [],
};
