import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'c8b1c7ddddb5.ngrok-free.app',
    ],
    hmr: {
      host: 'c8b1c7ddddb5.ngrok-free.app',
      protocol: 'wss',
    },
  },
});
