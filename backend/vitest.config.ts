import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-access-secret-at-least-32-characters',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://cesda:cesda_local@localhost:5432/cesda_test',
    },
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
