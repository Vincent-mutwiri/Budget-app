import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { up, down } from './001_add_schema_fields';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app';

async function runMigration() {
    const command = process.argv[2];

    if (!command || !['up', 'down'].includes(command)) {
        console.error('Usage: npm run migrate [up|down]');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully');

        if (command === 'up') {
            await up();
        } else if (command === 'down') {
            await down();
        }

        console.log('Migration operation completed');
    } catch (error) {
        console.error('Migration operation failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

runMigration();
