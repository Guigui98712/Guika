import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.obratracker.app',
  appName: 'Obra Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
      keystorePassword: undefined,
      keystoreKeyPassword: undefined,
    }
  },
  plugins: {
    AppUpdate: {
      // Configurações do Play Store
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.obratracker.app',
      // Habilita verificação automática de atualizações
      autoUpdateEnabled: true
    }
  }
};

export default config;
