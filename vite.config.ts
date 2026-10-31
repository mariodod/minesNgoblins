import { readFileSync } from 'node:fs';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * Edge and Chrome DevTools request this well-known JSON file while a page is
 * open. Vite answers 404, which shows up as a console error and makes browser
 * smoke tests fail on unrelated resource noise.
 */
function silenceDevtoolsProbe(): Plugin {
  const handle: Connect.NextHandleFunction = (_request, response) => {
    response.statusCode = 204;
    response.end();
  };

  return {
    name: 'silence-devtools-probe',
    configureServer(server) {
      server.middlewares.use('/.well-known/appspecific/com.chrome.devtools.json', handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/.well-known/appspecific/com.chrome.devtools.json', handle);
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const basePath = process.env.VITE_BASE_PATH ?? (isProduction ? '/minesNgoblins/' : '/');

  return {
    base: basePath,
    plugins: [silenceDevtoolsProbe()],
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
