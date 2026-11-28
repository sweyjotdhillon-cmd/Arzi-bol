import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveApiProxyTarget(): string {
  const explicitTarget = process.env.API_PROXY_TARGET?.trim();
  if (explicitTarget) {
    return explicitTarget;
  }

  const viteApiUrl = process.env.VITE_API_URL?.trim();
  if (viteApiUrl && /^https?:\/\//i.test(viteApiUrl)) {
    return viteApiUrl;
  }

  const isContainerized =
    process.env.DOCKER === 'true' ||
    fs.existsSync('/.dockerenv') ||
    fs.existsSync('/run/.containerenv');

  return isContainerized ? 'http://worker:8788' : 'http://127.0.0.1:8788';
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: resolveApiProxyTarget(),
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
