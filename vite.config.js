import { defineConfig } from 'vite';

export default defineConfig({
  base: '/CG-final-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  test: {
    environment: 'node'
  }
});
