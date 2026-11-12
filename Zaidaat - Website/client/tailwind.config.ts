/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5F0',
          100: '#FFE8DC',
          200: '#FCCDB6',
          400: '#E57A50',
          500: '#D45A2D',
          600: '#C2461B',
          700: '#A33814',
          800: '#832E12',
          900: '#672712',
        },
        navy: {
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#090E1A',
        },
        canvas: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15, 23, 42, 0.04)',
        card: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 10px -4px rgba(15, 23, 42, 0.04)',
        elevated: '0 16px 36px -8px rgba(15, 23, 42, 0.14), 0 4px 12px -2px rgba(15, 23, 42, 0.05)',
      },
      keyframes: {
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.98) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        dropdownIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'modal-in': 'modalIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'dropdown-in': 'dropdownIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toastIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
