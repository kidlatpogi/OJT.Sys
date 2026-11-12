import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() || 'https://ojt-sys.kidlat.workers.dev/dashboard';

const config: CapacitorConfig = {
  appId: 'com.ojtsys.app',
  appName: 'OJT.SYS',
  webDir: 'capacitor-www',
  android: {
    allowMixedContent: false,
  },
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith('http://'),
    androidScheme: 'https',
  },
};

export default config;

