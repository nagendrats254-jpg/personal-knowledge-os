/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark background palette
        void: {
          950: '#05050f',
          900: '#0a0a1a',
          800: '#0f0f2a',
          700: '#161630',
        },
        // Primary violet/indigo accent
        aurora: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Secondary cyan accent
        pulse: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        // Surface colors
        surface: {
          800: '#111827',
          700: '#1f2937',
          600: '#374151',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        'void-gradient': 'linear-gradient(180deg, #05050f 0%, #0f0f2a 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.05) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(139,92,246,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      boxShadow: {
        'aurora': '0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(6,182,212,0.1)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 0 1px rgba(139,92,246,0.3)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.5)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.5)',
      },
    },
  },
  plugins: [],
};
