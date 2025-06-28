// // eslint.config.js
// const js = require('@eslint/js');
// const typescript = require('@typescript-eslint/eslint-plugin');
// const typescriptParser = require('@typescript-eslint/parser');
// const importPlugin = require('eslint-plugin-import');
// const promisePlugin = require('eslint-plugin-promise');

// module.exports = [
//   // Base JavaScript configuration
//   js.configs.recommended,

//   // Global ignores
//   {
//     ignores: [
//       'node_modules/**',
//       'dist/**',
//       'coverage/**',
//       '**/*.js',
//       '**/*.d.ts',
//       'jest.config.js',
//       'eslint.config.js',
//     ],
//   },

//   // TypeScript files configuration
//   {
//     files: ['src/**/*.ts'],
//     languageOptions: {
//       parser: typescriptParser,
//       parserOptions: {
//         ecmaVersion: 2022,
//         sourceType: 'module',
//         project: './tsconfig.json',
//       },
//       globals: {
//         console: 'readonly',
//         process: 'readonly',
//         Buffer: 'readonly',
//         __dirname: 'readonly',
//         __filename: 'readonly',
//         exports: 'writable',
//         module: 'writable',
//         require: 'readonly',
//         global: 'readonly',
//       },
//     },
//     plugins: {
//       '@typescript-eslint': typescript,
//       import: importPlugin,
//       promise: promisePlugin,
//     },
//     rules: {
//       // TypeScript rules
//       '@typescript-eslint/explicit-function-return-type': 'error',
//       '@typescript-eslint/no-explicit-any': 'error',
//       '@typescript-eslint/no-unused-vars': [
//         'warn',
//         {
//           argsIgnorePattern: '^_',
//         },
//       ],
//       '@typescript-eslint/consistent-type-imports': 'error',

//       // Import rules
//       'import/order': [
//         'error',
//         {
//           groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
//           'newlines-between': 'always',
//           alphabetize: { order: 'asc' },
//         },
//       ],

//       // Turn off base rules that conflict with TypeScript
//       'no-unused-vars': 'off',
//       'no-undef': 'off',
//       'no-use-before-define': 'off',
//       'no-shadow': 'off',
//       '@typescript-eslint/no-shadow': 'error',
//     },
//     settings: {
//       'import/resolver': {
//         typescript: {},
//       },
//     },
//   },

//   // Test files - relaxed rules
//   {
//     files: ['**/*.test.ts', '**/*.spec.ts'],
//     rules: {
//       '@typescript-eslint/no-explicit-any': 'off',
//     },
//   },
// ];
