/** @type {import('tailwindcss').Config} */
// MI PYME — Sistema de diseño Claymorphism + Spatial UI
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta oficial MI PYME
        canvas: {
          light: '#F4F6F9', // Fondo modo claro (Spatial Canvas)
          dark: '#0E1116',  // Fondo modo oscuro
        },
        mint: '#00F5D4',    // Acento principal / CTA Cobro (Acid Mint)
        orchid: '#7209B7',  // Acento secundario (Electric Orchid)
        coral: '#FF5964',   // Alertas / stock bajo (Sunset Coral)
        amber: '#FFB703',   // Fiado / cuentas por cobrar (Amber Glow)
        carbon: '#1C1C1E',  // Texto principal (Negro Carbón Suave)
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
        glow: '0 0 24px rgba(0,245,212,0.45)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
