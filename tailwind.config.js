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
        // Trello & Atlassian Slate Palette
        slate: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        // Trello Blue
        blue: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#0C66E4',
          700: '#0055CC',
          800: '#0747A6',
          900: '#09326C',
        },
        // Backward compatibility mappings
        ocean: {
          50:  '#F0F7FF',
          100: '#E0EFFF',
          200: '#B9DDFF',
          300: '#85B8FF',
          400: '#579DFF',
          500: '#0C66E4',
          600: '#0055CC',
          700: '#0747A6',
          800: '#09326C',
          900: '#0A2540',
          950: '#1D2125',
        },
        abyss: {
          900:  '#161A1D',
          950:  '#1D2125',
          card: '#22272B',
        },
        aqua: {
          300: '#85B8FF',
          400: '#579DFF',
          500: '#0C66E4',
          600: '#0055CC',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'lg':  '8px',
        'xl':  '10px',
        '2xl': '12px',
      },
      boxShadow: {
        'trello': '0 1px 1px rgba(9, 30, 66, 0.12), 0 0 1px rgba(9, 30, 66, 0.2)',
        'trello-hover': '0 1px 3px rgba(9, 30, 66, 0.18), 0 0 1px rgba(9, 30, 66, 0.25)',
      },
    },
  },
  plugins: [],
};
