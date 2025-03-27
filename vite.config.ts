import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['electron']
  }
}); 