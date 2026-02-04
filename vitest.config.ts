import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    include: ['**/*.test.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '**/*.test.{ts,tsx}',
        '**/__tests__/**',
        '**/types/**',
        '**/types.ts',
        '**/index.ts',
        'src/server/services/ai/context.ts',
        'src/components/ui/**',
        'tests/**',
        'test-results/**',
        'playwright-report/**',
        'vitest.*.ts',
        'next.config.ts',
        'postcss.config.mjs',
        'tailwind.config.ts',
      ],
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 80,
        lines: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
