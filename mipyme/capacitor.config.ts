import type { CapacitorConfig } from '@capacitor/cli';

/** MI PYME — Configuración Capacitor (Android APK sin Android Studio en flujos principales) */
const config: CapacitorConfig = {
  appId: 'com.mipyme.tpv',
  appName: 'MI PYME',
  webDir: 'dist',
  android: { allowMixedContent: true },
  plugins: {
    // Cámara: escáner de códigos de barras en el mostrador
    Camera: { permissions: { camera: 'MI PYME necesita la cámara para escanear códigos de barras.' } },
  },
};

export default config;
