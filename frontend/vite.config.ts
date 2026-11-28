import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL?.startsWith('http')
          ? process.env.VITE_API_URL
          : 'http://worker:8788',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
