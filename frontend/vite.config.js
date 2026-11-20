import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Vite dev server forwards /api calls to the Express backend,
// so the browser only ever talks to one origin and no CORS setup is needed.
const apiTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
});
