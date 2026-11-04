import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const clientSrc = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  plugins: [vue()],
  resolve: {
    alias: [{ find: /^@\/(.*)$/, replacement: `${clientSrc}/$1` }],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
  },
  test: {
    // Forked workers sometimes fail to spawn on this machine (EPIPE); threads don't spawn processes.
    pool: 'threads',
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
});
