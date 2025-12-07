/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Agent colors
        discovery: '#00D4FF',
        researcher: '#FF6B6B',
        competitor: '#4ECDC4',
        technical: '#FFE66D',
        strategist: '#9B59B6',
        writer: '#E74C3C',
        gsc: '#4285F4',
        // UI colors
        dark: {
          100: '#1a1a2e',
          200: '#16162a',
          300: '#0f0f1a',
          400: '#0a0a0f',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
};
