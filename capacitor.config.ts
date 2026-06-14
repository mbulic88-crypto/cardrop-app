import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'rs.cardrop.app',
  appName: 'Cardrop',
  webDir: 'dist/public',
  // Ucitava produkcijsku verziju sajta direktno u WebView
  // Ne treba rebuild app-a svaki put kad se backend promeni
  server: {
    url: 'https://cardrop.app',
    cleartext: false,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#1e1e1e',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
