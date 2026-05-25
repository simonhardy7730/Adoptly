/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Adoptly — bleu navy premium + orange chaud
        primary:    '#1B4F8A',   // navy profond
        secondary:  '#2271B3',   // bleu clair vif
        accent:     '#F07A2A',   // orange premium
        success:    '#198754',   // vert adoption
        'bg-light': '#F4F7FF',   // fond doux bleuté
        // Utilitaires additionnels
        'primary-dark':  '#0F3460',
        'primary-light': '#D6E6FF',
        'accent-light':  '#FEF0E4',
        'surface':       '#FFFFFF',
        'muted':         '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.65rem', '1rem'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(27,79,138,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(27,79,138,0.10)',
        'button': '0 2px 8px rgba(240,122,42,0.35)',
        'glow':   '0 0 40px rgba(27,79,138,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-in-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'float':      'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
      backgroundImage: {
        'hero-gradient':   'linear-gradient(135deg, #0F3460 0%, #1B4F8A 50%, #2271B3 100%)',
        'cta-gradient':    'linear-gradient(135deg, #1B4F8A 0%, #2271B3 100%)',
        'accent-gradient': 'linear-gradient(135deg, #F07A2A 0%, #F5962A 100%)',
      },
    },
  },
  plugins: [],
};
