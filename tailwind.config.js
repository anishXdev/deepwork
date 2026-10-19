/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm paper tones
        paper: {
          50:  '#FDFAF5',
          100: '#FAF7F2',
          200: '#F5F0E8',
          300: '#EDE5D8',
          400: '#DDD3C3',
          500: '#C9BBAB',
        },
        // Warm ink / text
        ink: {
          50:  '#F5EFE6',
          100: '#E8DDD1',
          200: '#C5B5A5',
          300: '#A89880',
          400: '#8B7968',
          500: '#6B5E52',
          600: '#4D4239',
          700: '#352E28',
          800: '#231F1B',
          900: '#1A1714',
          950: '#110F0D',
        },
        // Warm charcoal for dark mode
        charcoal: {
          700: '#2C2722',
          800: '#231F1B',
          900: '#1A1714',
          950: '#110F0D',
        },
        // Accent: amber/ochre
        amber: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Keep these for backward compat but redirect
        ocean: {
          50:  '#FAF7F2',
          100: '#F5F0E8',
          200: '#EDE5D8',
          300: '#DDD3C3',
          400: '#C2A97E',
          500: '#B45309',
          600: '#92400E',
          700: '#78350F',
          800: '#4D4239',
          900: '#2C2722',
          950: '#1A1714',
        },
        abyss: {
          900:  '#231F1B',
          950:  '#1A1714',
          card: '#2C2722',
        },
        aqua: {
          300: '#C2A97E',
          400: '#D97706',
          500: '#B45309',
          600: '#92400E',
        },
        coral: {
          400: '#F87171',
          500: '#EF4444',
        }
      },
      fontFamily: {
        sans:  ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Georgia', 'Times New Roman', 'serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease both',
        'slide-up': 'slideUp 0.3s ease both',
        'pop-in':   'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        'float':    'floating 4s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'wave-slow': 'wave 8s ease-in-out infinite',
        'wave-fast': 'wave 4s ease-in-out infinite',
        'liquid-flow': 'fadeIn 0s both',
        'pulse-glow': 'pulseSoft 2s ease-in-out infinite',
        'liquid-wave-1': 'fadeIn 0s both',
        'liquid-wave-2': 'fadeIn 0s both',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '60%':  { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floating: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.7' },
          '50%':       { opacity: '1' },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%':       { transform: 'translateX(-10%)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(28,25,23,0.06), 0 1px 2px rgba(28,25,23,0.04)',
        'card-md': '0 4px 12px rgba(28,25,23,0.08), 0 2px 4px rgba(28,25,23,0.04)',
        'card-lg': '0 10px 30px rgba(28,25,23,0.10), 0 4px 8px rgba(28,25,23,0.05)',
      }
    },
  },
  plugins: [],
}
