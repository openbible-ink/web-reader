import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'bootstrap/ssr/**',
            'node_modules/**',
            'playwright-report/**',
            'public/build/**',
            'resources/js/actions/**',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
            'test-results/**',
            'vendor/**',
        ],
    },
    {
        ...js.configs.recommended,
        files: ['*.{js,mjs,ts}', 'scripts/**/*.{js,mjs,ts}'],
        languageOptions: {
            globals: globals.node,
        },
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: [
            'resources/js/**/*.{ts,tsx}',
            'tests/e2e/**/*.ts',
            '*.{ts,mts}',
        ],
    })),
    {
        files: [
            'resources/js/**/*.{ts,tsx}',
            'tests/e2e/**/*.ts',
            '*.{ts,mts}',
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2024,
                ...globals.node,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            'jsx-a11y': jsxA11y,
            'react-hooks': reactHooks,
        },
        rules: {
            ...jsxA11y.configs.recommended.rules,
            'react-hooks/exhaustive-deps': 'warn',
            'react-hooks/rules-of-hooks': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'jsx-a11y/no-autofocus': 'off',
            'no-undef': 'off',
        },
        settings: {
            'jsx-a11y': {
                components: {
                    Link: 'a',
                },
            },
        },
    },
    {
        files: ['**/*.d.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
