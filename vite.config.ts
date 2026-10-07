import { defineConfig } from 'vite';

// Build estático. A saída vai para public/: é a pasta que o Worker publica (ele espelha o branch
// no GitHub) e a que o wrangler envia. Por isso publicDir fica desligado: não há arquivos a copiar.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 8787,
    strictPort: true,
  },
});
