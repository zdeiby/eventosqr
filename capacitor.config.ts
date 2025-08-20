import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.appjuventud.starter',
  appName: 'appjuventud',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      androidAccuracy: 'high',  // Utiliza el GPS de alta precisión
    },
  },
};

export default config;
