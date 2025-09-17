import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['node_modules', 'coverage', 'dist', 'build', '.tmp', '.vscode'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Critical rules (errors)
      semi: ['error', 'always'],
      indent: ['error', 2, { SwitchCase: 1 }],

      // Soft naming conventions (warn)
      camelcase: ['warn', { properties: 'always' }],
      'id-match': [
        'warn',
        '^(?:[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[A-Z0-9_]+)$',
        { onlyDeclarations: true },
      ],
      'new-cap': ['warn', { newIsCap: true, capIsNew: false }],

      // Extras
      eqeqeq: 'error',
      'prefer-const': 'warn',
      'no-console': 'off',
    },
  },
  js.configs.recommended, // brings eslint:recommended rules
];
