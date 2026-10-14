/** @type {import('tailwindcss').Config} */
// MI PYME — Sistema de diseño Claymorphism + Spatial UI
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en: UI Dark/Orange Premium
        canvas: {
          light: '#242428', // Fondo oscuro elegante tipo salón
          dark: '#161618',  // Fondo oscuro profundo base
        },
        mint: '#D48331',    // Acento principal (Cobre cálido / Ámbar oro de la referencia)
        orchid: '#E07A2F',  // Acento secundario (Terracota / Cobre secundario)
        coral: '#FF5964',   // Alertas
        amber: '#F59E0B',   // Advertencias
        carbon: '#FFFFFF',  // Texto principal
        secondary: '#9CA3AF', // Texto secundario
      },
      borderRadius: {
        clay: '28px',       // Esquinas súper redondeadas
        pill: '9999px',     // Botones tipo píldora VisionOS
      },
      boxShadow: {
        // Sombras duales claymórficas: interior superior clara + exterior inferior difusa
        clay: 'inset 0 2px 6px rgba(255,255,255,0.85), 0 12px 32px -8px rgba(28,28,30,0.18)',
        'clay-dark': 'inset 0 2px 6px rgba(255,255,255,0.08), 0 14px 36px -8px rgba(0,0,0,0.6)',
        'clay-inset': 'inset 0 3px 8px rgba(28,28,30,0.12), inset 0 -2px 4px rgba(255,255,255,0.7)',
        float: '0 24px 60px -12px rgba(28,28,30,0.35)',
        glow: '0 0 24px rgba(212,131,49,0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
