import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';

// Global test setup
beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';

    // Disable console logs during tests (optional)
    if (process.env.SILENT_TESTS === 'true') {
        console.log = () => { };
        console.error = () => { };
        console.warn = () => { };
    }
});

afterAll(async () => {
    // Cleanup any global resources
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});