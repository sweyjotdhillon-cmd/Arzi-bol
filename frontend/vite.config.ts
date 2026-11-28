import { lookup } from 'node:dns/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DOCKER_WORKER_TARGET = 'http://worker:8788';
const LOCALHOST_WORKER_TARGET = 'http://127.0.0.1:8788';
const DNS_LOOKUP_TIMEOUT_MS = 500;

async function isHostnameResolvable(hostname: string): Promise<boolean> {
  try {
    await Promise.race([
      lookup(hostname),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('DNS lookup timeout')), DNS_LOOKUP_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function resolveApiProxyTarget(): Promise<string> {
  const explicitTarget = process.env.API_PROXY_TARGET?.trim();
  if (explicitTarget) {
    return explicitTarget;
  }

  const viteApiUrl = process.env.VITE_API_URL?.trim();
  if (viteApiUrl && /^https?:\/\//i.test(viteApiUrl)) {
    return viteApiUrl;
  }

  const workerResolvable = await isHostnameResolvable('worker');
  return workerResolvable ? DOCKER_WORKER_TARGET : LOCALHOST_WORKER_TARGET;
}

export default defineConfig(async () => {
  const apiProxyTarget = await resolveApiProxyTarget();

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
