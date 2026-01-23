import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7B1113',
        'primary-hover': '#961517',
        'primary-active': '#5a0c0e',
        'msu-gold': '#FDB913',
        'msu-green': '#006400',
        'bg-light': '#f6f7f8',
        'bg-dark': '#101822',
        'card-dark': '#1a2634',
      },
      fontFamily: {
        sans: ['Lexend', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

export default config
