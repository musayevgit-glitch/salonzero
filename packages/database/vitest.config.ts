import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Load root .env file from two levels up
  const env = loadEnv(mode, '../../', '');
  return {
    test: {
      environment: 'node',
      globals: false,
      env,
    },
  };
});
