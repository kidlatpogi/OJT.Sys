import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.ojtsys.app',
  appName: 'OJT.SYS',
  webDir: 'capacitor-www',
  android: {
    allowMixedContent: false,
  },
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith('http://'),
        androidScheme: 'https',
      }
    : {
        androidScheme: 'https',
      },
};

export default config;

