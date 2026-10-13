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
          light: '#32363E', // Fondo modo oscuro base
          dark: '#282C34',  // Fondo modo oscuro degradado
        },
        mint: '#FF7A00',    // Acento principal (CTA Cobro)
        orchid: '#FF9A3C',  // Acento secundario (Selección activa)
        coral: '#FF5964',   // Alertas (mantenemos alerta)
        amber: '#FFB703',   // Fiado (mantenemos alerta)
        carbon: '#FFFFFF',  // Texto principal
        secondary: '#A6ACB8', // Texto secundario
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
        glow: '0 0 24px rgba(142,182,155,0.48)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
