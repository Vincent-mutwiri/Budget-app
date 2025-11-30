module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'services/**/*.ts',
        'models/**/*.ts',
        '!**/*.d.ts',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    verbose: true,
    testTimeout: 30000, // 30 seconds for integration tests
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts']
};
