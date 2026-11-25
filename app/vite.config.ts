import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './'：產出相對路徑，部署在 Pages 根目錄或子路徑都能用
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
});
