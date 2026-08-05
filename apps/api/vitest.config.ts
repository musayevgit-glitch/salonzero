import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS's DI relies on TypeScript's emitDecoratorMetadata; Vitest's default esbuild transform does
// not emit it, which silently breaks constructor injection (providers come through as undefined).
// SWC (via unplugin-swc + .swcrc) does emit it correctly — this is the standard fix for testing
// NestJS apps with Vitest.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 15000,
  },
});
