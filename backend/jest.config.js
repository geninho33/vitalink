module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/seeds/**',
    '!src/scripts/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
  ],
  testTimeout: 10000,
  verbose: true,
};
