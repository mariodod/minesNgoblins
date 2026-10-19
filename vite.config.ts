import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const basePath = process.env.VITE_BASE_PATH ?? (isProduction ? '/minesNgoblins/' : '/');

  return {
    base: basePath,
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
      passWithNoTests: false,
    },
  };
});
