/**
 * Jest setup file for integration tests
 * This file runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
    console.log('Starting integration tests...');
});

// Global test teardown
afterAll(() => {
    console.log('Integration tests completed.');
});
