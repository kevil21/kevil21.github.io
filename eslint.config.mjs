// @ts-check
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default defineConfig([
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'public/**',
      'playwright-report/**',
      'test-results/**',
      '.lighthouseci/**',
      '.cache/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'tests/**/*.ts', 'playwright.config.ts', 'vitest.config.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // Node-run files (no `globals` package: declare the few we use)
    files: ['*.cjs', '*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        module: 'writable',
        require: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    // The inline pre-paint script is deliberately ES5 (runs before any bundle, in every browser).
    files: ['src/components/ThemeScript.astro', 'src/components/ThemeScript.astro/*.js'],
    rules: { 'no-var': 'off', '@typescript-eslint/no-unused-vars': 'off', 'prefer-const': 'off' },
  },
]);
