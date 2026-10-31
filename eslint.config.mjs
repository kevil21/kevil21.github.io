import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.astro/**', 'public/**', 'assets-source/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'performance-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['scripts/*.mjs'], languageOptions: { globals: { console: 'readonly' } } },
  { files: ['**/*.ts'], rules: { '@typescript-eslint/consistent-type-imports': 'error' } },
);