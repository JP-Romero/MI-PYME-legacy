/** @type {import('tailwindcss').Config} */
// MI PYME — Master Prompt Design System
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#EBF1F5', // Superficie de Trabajo Principal (Spatial Sheet Flotante)
          dark: '#0D223A',  // Fondo Espacial Superior / Cabecera
        },
        header: '#0D223A',
        'header-sat': '#1A3B5D',
        sheet: '#EBF1F5',
        carddark: '#1C3047',
        orchid: '#1A3B5D',  // Saturation / secondary accent
        mint: '#32D74B',    // Acento de Éxito / Entradas / Stock
        amber: '#F7B250',   // Acento Principal / Acción de Cobro (CTA)
        coral: '#FF5964',   // Alertas
        carbon: '#0F1D2D',  // Texto sobre fondo claro
        secondary: '#7D8B9B', // Texto secundario / Subtítulos
      },
      borderRadius: {
        clay: '32px',       // Esquinas súper redondeadas (32px según master prompt)
        pill: '9999px',     // Botones tipo píldora
      },
      boxShadow: {
        clay: 'inset 0 2px 6px rgba(255,255,255,0.85), 0 12px 32px -8px rgba(13,34,58,0.18)',
        'clay-dark': 'inset 0 2px 6px rgba(255,255,255,0.08), 0 14px 36px -8px rgba(0,0,0,0.6)',
        'clay-inset': 'inset 0 3px 8px rgba(13,34,58,0.12), inset 0 -2px 4px rgba(255,255,255,0.7)',
        float: '0 24px 60px -12px rgba(13,34,58,0.35)',
        glow: '0 0 24px rgba(247,178,80,0.48)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
