import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pinkteam: {
          blush: '#FFF5F8',
          soft: '#FFD8E5',
          light: '#FFAFCA',
          magenta: '#B32151',
          deep: '#8E163E',
          charcoal: '#1F1216',
          plum: '#4A353C',
          muted: '#6B4E57',
        },
      },
      fontFamily: {
        display: ['var(--font-prompt)', 'sans-serif'],
        sans: ['var(--font-ibm-thai)', 'var(--font-prompt)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
