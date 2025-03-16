const tseslint = require('typescript-eslint');
const jestPlugin = require('eslint-plugin-jest');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test/**',
      '.eslintrc.js',
      'jest.config.js',
      'tsconfig.json',
      'tsconfig.test.json',
      'bin.js',
      'bin/**'
    ]
  },
  // JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  },
  // TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2020
      },
      globals: {
        node: true,
        jest: true
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'jest': jestPlugin,
      'prettier': prettierPlugin
    },
    extends: [
      ...tseslint.configs.recommended,
      { plugins: { jest: jestPlugin }, rules: jestPlugin.configs.recommended.rules },
      prettierConfig
    ],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'prettier/prettier': ['error', {
        'endOfLine': 'auto',
        'singleQuote': true,
        'trailingComma': 'all',
        'printWidth': 100,
      }]
    }
  }
); 