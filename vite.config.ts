import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Optional: set DISABLE_HMR=true to turn off HMR/file watching.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        // Recipes stay on the Node server (/api/recipes); everything else → Spring Boot.
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          bypass(req) {
            const url = req.url || '';
            if (url.startsWith('/api/recipes')) return url;
          },
        },
      },
    },
  };
});
