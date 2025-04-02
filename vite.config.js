/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer', // ビルド出力先をプロジェクトルートからの相対パスで指定
    emptyOutDir: true, // ビルド前に出力ディレクトリをクリーンアップ
  },
  server: {
    port: 5173,
  },
  // Add Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.js', // Path to setup file relative to root
    css: true, // Enable CSS processing if needed for tests
  },
});
