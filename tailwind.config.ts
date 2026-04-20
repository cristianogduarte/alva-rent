import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Identidade ALVA ONE
        navy: {
          50: '#F2F4F8',
          100: '#DDE2EB',
          200: '#B5C0D2',
          300: '#8C9AB6',
          400: '#5C6F92',
          500: '#3D4F6E',
          600: '#2A3A57',
          700: '#1D2D4F',
          800: '#152340',
          900: '#0E1E3A', // primary
        },
        gold: {
          50: '#FBF7EE',
          100: '#F5EBD8',
          200: '#EAD7B0',
          300: '#DEC395',
          400: '#D4B884',
          500: '#C9A86B', // accent
          600: '#A88751',
          700: '#86683E',
        },
        ink: {
          400: '#9098A8',
          500: '#6B7180',
          600: '#4B5163',
          700: '#2A2F3A',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(14,30,58,0.06), 0 8px 24px rgba(14,30,58,0.04)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
