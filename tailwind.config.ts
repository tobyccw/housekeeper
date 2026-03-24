import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F4F0',
        accent: {
          DEFAULT: '#C17B3C',
          50: '#FAF2E8',
          100: '#F0D9B8',
          200: '#E0BC8A',
          500: '#C17B3C',
          600: '#A56530',
        },
        warm: {
          50: '#FAFAF7',
          100: '#F5F4F0',
          200: '#EDE9E1',
          300: '#D4CEC4',
          400: '#8C8C7A',
          500: '#5C5C4A',
          700: '#2C2C1E',
          900: '#18180F',
        },
        category: {
          food: '#E8C17A',
          meal: '#E09484',
          household: '#96BAA0',
          homeware: '#7EA8C4',
          subscription: '#88B8B4',
          others: '#C0B4A8',
        },
      },
      fontFamily: {
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
