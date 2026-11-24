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
          paper: '#F8F5F6',
          raised: '#F2ECEE',
          blush: '#FDF4F7',
          soft: '#F3D8E2',
          light: '#FFAFCA',
          magenta: '#B32151',
          deep: '#8E163E',
          charcoal: '#1F1216',
          plum: '#4A353C',
          secondary: '#57484D',
          muted: '#7A6A70',
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
