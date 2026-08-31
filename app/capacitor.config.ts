import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.allsetlabs.devbot',
  appName: 'DevBot',
  webDir: 'dist',
  server: {
    // Use https scheme so BrowserRouter works and Clipboard/Crypto APIs are available
    androidScheme: 'https',
    // For live reload during development, uncomment and set your dev server URL:
    // url: 'https://YOUR_HOST_IP:4005',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
};

export default config;
