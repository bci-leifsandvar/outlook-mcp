module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Possible Errors
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-throw-literal': 'error',
    'require-await': 'warn',
    
    // Stylistic Issues
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-spacing': ['error', { before: false, after: true }],
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    
    // ES6
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'prefer-template': 'warn',
    'template-curly-spacing': 'error',
    
    // Security
    'no-new-func': 'error',
    
    // Node.js Specific
    'handle-callback-err': 'error',
    'no-path-concat': 'error'
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
