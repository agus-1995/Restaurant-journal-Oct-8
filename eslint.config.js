import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      prettier,
    ],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Architecture guardrail: UI code must go through hooks + repository interfaces,
  // never import the mock implementation directly. Only src/data (and the test helpers
  // that build isolated mock instances) may.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**', 'src/test/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/mock', '**/data/mock/*'],
              message:
                'Do not import mock data directly. Use hooks from src/hooks (they go through the repository provider).',
            },
          ],
        },
      ],
    },
  },
  {
    // Context/provider modules legitimately export hooks and components together.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
)
