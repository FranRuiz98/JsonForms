import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'projects/**/src/test.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    include: [
      'projects/**/*.spec.ts',              // spec files next to source code
      'projects/**/test/**/*.spec.ts',       // test suite in test/ folders
    ],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
  },
});
