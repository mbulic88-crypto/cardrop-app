import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'rs.cardrop.app',
  appName: 'CarDrop',
  webDir: 'dist/public',
  // Učitava produkcijsku verziju sajta direktno u WebView
  // Ovo znači da ne treba rebuild app-a svaki put kad se backend promeni
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
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#1e1e1e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#52B788',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e1e1e',
    },
  },
};

export default config;
