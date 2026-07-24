import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: [
      // Les dépendances qui semblent poser problème
      'primeng/api',
      '@primeng/themes',
      'primeng/config'
    ]
  }
});
