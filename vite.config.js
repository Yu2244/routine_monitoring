import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Electronアプリで正しく動作するための相対パス指定
  root: 'src/renderer', // レンダラーコードのルートディレクトリを指定
  build: {
    outDir: '../../dist/renderer', // ビルド出力先をプロジェクトルートからの相対パスで指定
    emptyOutDir: true, // ビルド前に出力ディレクトリをクリーンアップ
  },
  server: {
    port: 5173, // 開発サーバーのポート (main.jsで指定したものと合わせる)
  },
});
