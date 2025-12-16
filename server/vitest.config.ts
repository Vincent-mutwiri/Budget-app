import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        teardownTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                'dist/',
                '**/*.d.ts',
                'scripts/',
                'vitest.config.ts'
            ]
        }
    }
});