import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    include: "**/*.{jsx,tsx,js,ts}",
  })],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://theaitutors.com',
        changeOrigin: true,
        secure: true
      },
      '/MachineLearning6025': {
        target: 'https://theaitutors.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  optimizeDeps: {
    exclude: ['openai']
  }
});