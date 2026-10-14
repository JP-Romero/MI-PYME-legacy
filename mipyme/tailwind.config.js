/** @type {import('tailwindcss').Config} */
// MI PYME — Custom User Palette: #143959, #56738C, #A7C1D9, #DCEAF2, #DFAD48
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#DCEAF2', // #DCEAF2
          dark: '#143959',  // #143959
        },
        header: '#143959',       // #143959
        'header-sat': '#56738C', // #56738C
        sheet: '#DCEAF2',        // #DCEAF2
        carddark: '#56738C',     // #56738C
        orchid: '#A7C1D9',       // #A7C1D9
        mint: '#DFAD48',         // #DFAD48 (Acento principal / CTA Oro)
        amber: '#DFAD48',        // #DFAD48
        coral: '#FF5964',        // Alertas
        carbon: '#143959',       // Texto principal
        secondary: '#56738C',    // Texto secundario
      },
      borderRadius: {
        clay: '32px',
        pill: '9999px',
      },
      boxShadow: {
        clay: 'inset 0 2px 6px rgba(255,255,255,0.85), 0 12px 32px -8px rgba(20,57,89,0.18)',
        'clay-dark': 'inset 0 2px 6px rgba(255,255,255,0.08), 0 14px 36px -8px rgba(0,0,0,0.6)',
        'clay-inset': 'inset 0 3px 8px rgba(20,57,89,0.12), inset 0 -2px 4px rgba(255,255,255,0.7)',
        float: '0 24px 60px -12px rgba(20,57,89,0.35)',
        glow: '0 0 24px rgba(223,173,72,0.48)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
