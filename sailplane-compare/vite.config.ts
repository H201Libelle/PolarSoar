import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative base path so it works on GitHub Pages and Netlify
  base: './',
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
