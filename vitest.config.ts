import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Quatro suítes (R-11):
 *   unit        — funções puras de src/lib e src/services, sem DOM
 *   integration — componentes reais contra o fake in-memory das portas (Princípios IV e VIII)
 *   rls         — requisições diretas ao Supabase **local e efêmero** (CT-3)
 *   a11y        — axe-core sobre o render das telas
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'integration',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['tests/setup.ts'],
          include: ['tests/integration/**/*.test.{ts,tsx}'],
          testTimeout: 15_000,
        },
      },
      {
        test: {
          name: 'rls',
          environment: 'node',
          include: ['tests/rls/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          poolOptions: { forks: { singleFork: true } },
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'a11y',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['tests/setup.ts'],
          include: ['tests/a11y/**/*.test.{ts,tsx}'],
          testTimeout: 15_000,
        },
      },
    ],
  },
});
