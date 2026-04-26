import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.be9d20f3049946c8b14b1f17a08fc233',
  appName: 'A Lovable project',
  webDir: 'dist/client',
  server: {
    url: 'https://be9d20f3-0499-46c8-b14b-1f17a08fc233.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
