import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Relative base so the build serves from any directory (the harness serves each
// app's dist/ from its own local static server).
export default defineConfig({
  base: './',
  plugins: [react()],
});
