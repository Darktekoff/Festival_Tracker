import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // Meilleur pour React Native
    include: ['**/__tests__/**/*.{js,ts}', '**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.expo'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000, // 10s pour tests d'intégration
    hookTimeout: 10000,
    retry: 1, // Retry une fois en cas d'échec
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': './src',
      '@tests': './src/__tests__',
    },
  },
  define: {
    // Mock des variables d'environnement pour les tests
    __DEV__: true,
    'process.env.NODE_ENV': '"test"',
  },
});