import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.toldi.launchalert',
  appName: 'Attack Launch Alert',
  webDir: 'dist',
  plugins:{
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#d2c09e",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
    },
  }
};

export default config;
