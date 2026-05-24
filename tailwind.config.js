/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ChargeQ Design Tokens — preserved verbatim from V2
      colors: {
        bg: {
          DEFAULT: '#091510',
          2: '#0d2018',
          3: '#112a1e',
        },
        surf: {
          DEFAULT: '#0f2318',
          2: '#152e22',
        },
        g: {
          DEFAULT: '#1D9E75',
          dark: '#085041',
          mid: '#0F6E56',
          light: 'rgba(29,158,117,0.15)',
          border: 'rgba(29,158,117,0.25)',
          card: 'rgba(29,158,117,0.08)',
        },
        a: {
          DEFAULT: '#EF9F27',
          light: 'rgba(239,159,39,0.12)',
          border: 'rgba(239,159,39,0.35)',
        },
        r: {
          DEFAULT: '#E24B4A',
          light: 'rgba(226,75,74,0.12)',
          border: 'rgba(226,75,74,0.35)',
        },
        b: {
          DEFAULT: '#378ADD',
          light: 'rgba(55,138,221,0.12)',
        },
        cream: '#f0efe8',
        mint: '#9FE1CB',
        teal: '#5DCAA5',
        amber: '#FAC775',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        cq: '16px',
        'cq-sm': '10px',
      },
      animation: {
        pulse: 'pulse 1.6s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)',
        'slide-sheet': 'slideSheet 0.3s cubic-bezier(0.2, 0.8, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.8)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideSheet: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
