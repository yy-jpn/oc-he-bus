import { defineConfig } from 'vite';

const MODEL_BASE_URL = 'https://pub-9cac8877191a4c3697edb59fd982130f.r2.dev';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  assetsInclude: ['**/*.wasm', '**/*.onnx'],
  server: {
    proxy: {
      // R2 CDNがCORSヘッダーを返さないため、開発時はプロキシ経由でモデルをダウンロード
      '/models': {
        target: MODEL_BASE_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/models/, ''),
      },
    },
  },
  worker: {
    format: 'es',
  },
});
