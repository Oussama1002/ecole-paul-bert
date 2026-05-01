/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        school: {
          // Surfaces
          cream: '#FFFBF2',
          paper: '#FFFFFF',
          mist: '#E8F4FF',
          // Primary rainbow family (kept legacy names so existing classes keep working)
          sky: '#4FC3F7',        // bright sky blue
          skydeep: '#1E88E5',    // ocean blue
          leaf: '#66D17A',       // grass green
          leafdeep: '#2EAE4F',   // deep green
          sun: '#FFD43B',        // sunshine yellow
          sunsoft: '#FFF6C9',    // soft yellow
          coral: '#FF7A6B',      // watermelon coral
          lilac: '#B79CED',      // candy lilac
          // New playful accents
          bubblegum: '#FF6FB5',  // pink
          grape: '#8E5CFF',      // purple
          mango: '#FF9F43',      // orange
          mint: '#6DE0C8',       // turquoise mint
          cherry: '#EF4B6B',     // red-pink
          // Text / lines
          ink: '#2A2A5A',        // a playful navy
          inkmuted: '#6F6FA0',
          border: '#F0E4D4',
          line: '#ECE6F5',       // neutral divider / input border in themed pages
          bg: '#F6F3FB',         // neutral soft page-chrome background (table headers, etc.)
          chip: '#F3EDFF',       // very light lilac for filter chips
        },
      },
      fontFamily: {
        display: ['"Fredoka"', 'Nunito', 'system-ui', 'sans-serif'],
        sans: ['"Nunito"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        school:
          '0 6px 24px -6px rgba(30, 136, 229, 0.18), 0 10px 32px -12px rgba(255, 111, 181, 0.18)',
        'school-lg':
          '0 12px 44px -8px rgba(142, 92, 255, 0.22), 0 20px 56px -16px rgba(79, 195, 247, 0.22)',
        'school-inner': 'inset 0 2px 10px rgba(42, 42, 90, 0.06)',
        'school-pop':
          '0 10px 0 -4px rgba(255, 212, 59, 0.35), 0 16px 36px -12px rgba(142, 92, 255, 0.25)',
      },
      borderRadius: {
        school: '1.5rem',
        'school-lg': '2rem',
      },
      backgroundImage: {
        'school-radial':
          'radial-gradient(circle at 15% 15%, rgba(79, 195, 247, 0.22) 0%, transparent 45%), radial-gradient(circle at 85% 10%, rgba(255, 111, 181, 0.18) 0%, transparent 42%), radial-gradient(circle at 80% 85%, rgba(255, 212, 59, 0.20) 0%, transparent 45%), radial-gradient(circle at 15% 90%, rgba(102, 209, 122, 0.18) 0%, transparent 45%)',
        'school-sidebar':
          'linear-gradient(165deg, #8E5CFF 0%, #4FC3F7 40%, #66D17A 72%, #FFD43B 100%)',
        'school-login':
          'linear-gradient(135deg, #FF6FB5 0%, #8E5CFF 30%, #4FC3F7 65%, #66D17A 100%)',
        'school-rainbow':
          'linear-gradient(90deg, #FF6FB5 0%, #FF9F43 20%, #FFD43B 40%, #66D17A 60%, #4FC3F7 80%, #8E5CFF 100%)',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'wiggle-soft': 'wiggle 2.4s ease-in-out infinite',
        'pop-in': 'popIn 0.4s cubic-bezier(.34,1.56,.64,1) both',
        'rainbow-slide': 'rainbowSlide 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        rainbowSlide: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
}
