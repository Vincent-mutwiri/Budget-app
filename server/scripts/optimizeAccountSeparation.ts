import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { Transfer } from '../models/Transfer';

/**
 * Performance optimization script for Account Separation feature
 * 
 * This script:
 * 1. Creates missing database indexes
 * 2. Analyzes query performance
 * 3. Optimizes slow queries
 * 4. Provides performance recommendations
 */

interface PerformanceStats {
    totalUsers: number;
    totalTransactions: number;
    totalTransfers: number;
    indexesCreated: number;
    slowQueries: string[];
    recommendations: string[];
}

async function connectToDatabase() {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
}

async function createOptimalIndexes(): Promise<number> {
    console.log('🔧 Creating optimal indexes...');
    let indexesCreated = 0;

    try {
        // Account indexes
        await Account.collection.createIndex({ userId: 1, accountCategory: 1 });
        await Account.collection.createIndex({ userId: 1, isMain: 1 });
        indexesCreated += 2;

        // Transaction indexes (additional to existing ones)
        await Transaction.collection.createIndex({ userId: 1, accountType: 1, date: -1 });
        await Transaction.collection.createIndex({ userId: 1, isVisible: 1, date: -1 });
        await Transaction.collection.createIndex({ userId: 1, specialCategory: 1, date: -1 });
        await Transaction.collection.createIndex({ userId: 1, type: 1, accountType: 1 });
        indexesCreated += 4;

        // Transfer indexes
        await Transfer.collection.createIndex({ userId: 1, date: -1 });
        await Transfer.collection.createIndex({ userId: 1, status: 1 });
        await Transfer.collection.createIndex({ userId: 1, type: 1, status: 1 });
        indexesCreated += 3;

        console.log(`✅ Created ${indexesCreated} indexes`);
        return indexesCreated;

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        return indexesCreated;
    }
}

async function analyzeQueryPerformance(): Promise<string[]> {
    console.log('📊 Analyzing query performance...');
    const slowQueries: string[] = [];

    try {
        // Test common queries and measure performance
        const testUserId = 'performance-test-user';

        // 1. Account summary query
        const start1 = Date.now();
        await Account.find({ userId: testUserId });
        const time1 = Date.now() - start1;
        if (time1 > 100) {
            slowQueries.push(`Account lookup: ${time1}ms (should be < 100ms)`);
        }

        // 2. Visible transactions query
        const start2 = Date.now();
        await Transaction.find({
            userId: testUserId,
            isVisible: true
        }).sort({ date: -1 }).limit(50);
        const time2 = Date.now() - start2;
        if (time2 > 200) {
            slowQueries.push(`Visible transactions: ${time2}ms (should be < 200ms)`);
        }

        // 3. Special transactions query
        const start3 = Date.now();
        await Transaction.find({
            userId: testUserId,
            specialCategory: 'debt'
        }).sort({ date: -1 });
        const time3 = Date.now() - start3;
        if (time3 > 150) {
            slowQueries.push(`Special transactions: ${time3}ms (should be < 150ms)`);
        }

        // 4. Transfer history query
        const start4 = Date.now();
        await Transfer.find({ userId: testUserId }).sort({ date: -1 });
        const time4 = Date.now() - start4;
        if (time4 > 100) {
            slowQueries.push(`Transfer history: ${time4}ms (should be < 100ms)`);
        }

        // 5. Balance calculation aggregation
        const start5 = Date.now();
        await Transaction.aggregate([
            { $match: { userId: testUserId, accountType: 'main' } },
            { $group: { _id: '$type', total: { $sum: '$amount' } } }
        ]);
        const time5 = Date.now() - start5;
        if (time5 > 200) {
            slowQueries.push(`Balance aggregation: ${time5}ms (should be < 200ms)`);
        }

        console.log(`📊 Performance analysis complete. Found ${slowQueries.length} slow queries`);
        return slowQueries;

    } catch (error) {
        console.error('❌ Error analyzing performance:', error);
        return slowQueries;
    }
}

async function generateRecommendations(stats: PerformanceStats): Promise<string[]> {
    const recommendations: string[] = [];

    // Check data volume
    if (stats.totalTransactions > 100000) {
        recommendations.push('Consider implementing transaction archiving for old data');
        recommendations.push('Add pagination to transaction queries');
    }

    if (stats.totalUsers > 10000) {
        recommendations.push('Consider database sharding by userId');
        recommendations.push('Implement read replicas for better query performance');
    }

    // Check slow queries
    if (stats.slowQueries.length > 0) {
        recommendations.push('Optimize slow queries identified in performance analysis');
        recommendations.push('Consider adding more specific indexes for slow queries');
    }

    // General recommendations
    recommendations.push('Implement Redis caching for frequently accessed account summaries');
    recommendations.push('Use connection pooling to optimize database connections');
    recommendations.push('Monitor query execution plans regularly');
    recommendations.push('Set up database performance monitoring alerts');

    return recommendations;
}

async function cleanupOldData(): Promise<void> {
    console.log('🧹 Cleaning up old data...');

    try {
        // Remove cancelled transfers older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deletedTransfers = await Transfer.deleteMany({
            status: 'cancelled',
            createdAt: { $lt: thirtyDaysAgo }
        });

        console.log(`🗑️  Cleaned up ${deletedTransfers.deletedCount} old cancelled transfers`);

        // Archive very old transactions (optional - commented out for safety)
        /*
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const oldTransactions = await Transaction.find({
            date: { $lt: oneYearAgo },
            accountType: 'main'
        });
        
        console.log(`📦 Found ${oldTransactions.length} transactions older than 1 year for potential archiving`);
        */

    } catch (error) {
        console.error('❌ Error cleaning up data:', error);
    }
}

async function validateDataIntegrity(): Promise<boolean> {
    console.log('🔍 Validating data integrity...');

    try {
        let issues = 0;

        // Check for accounts without proper categories
        const uncategorizedAccounts = await Account.countDocuments({
            accountCategory: { $exists: false }
        });
        if (uncategorizedAccounts > 0) {
            console.error(`❌ Found ${uncategorizedAccounts} accounts without category`);
            issues++;
        }

        // Check for transactions without account type
        const unclassifiedTransactions = await Transaction.countDocuments({
            accountType: { $exists: false }
        });
        if (unclassifiedTransactions > 0) {
            console.error(`❌ Found ${unclassifiedTransactions} unclassified transactions`);
            issues++;
        }

        // Check for transfers with invalid status
        const invalidTransfers = await Transfer.countDocuments({
            status: { $nin: ['pending', 'completed', 'cancelled'] }
        });
        if (invalidTransfers > 0) {
            console.error(`❌ Found ${invalidTransfers} transfers with invalid status`);
            issues++;
        }

        if (issues === 0) {
            console.log('✅ Data integrity validation passed');
            return true;
        } else {
            console.error(`❌ Data integrity validation failed with ${issues} issues`);
            return false;
        }

    } catch (error) {
        console.error('❌ Error validating data integrity:', error);
        return false;
    }
}

async function runOptimization() {
    console.log('🚀 Starting Account Separation Performance Optimization...\n');

    const stats: PerformanceStats = {
        totalUsers: 0,
        totalTransactions: 0,
        totalTransfers: 0,
        indexesCreated: 0,
        slowQueries: [],
        recommendations: []
    };

    try {
        await connectToDatabase();

        // Gather statistics
        stats.totalUsers = await Account.distinct('userId').then(users => users.length);
        stats.totalTransactions = await Transaction.countDocuments();
        stats.totalTransfers = await Transfer.countDocuments();

        console.log(`📊 Database Statistics:`);
        console.log(`  Users: ${stats.totalUsers}`);
        console.log(`  Transactions: ${stats.totalTransactions}`);
        console.log(`  Transfers: ${stats.totalTransfers}\n`);

        // Create indexes
        stats.indexesCreated = await createOptimalIndexes();

        // Analyze performance
        stats.slowQueries = await analyzeQueryPerformance();

        // Validate data integrity
        const isDataValid = await validateDataIntegrity();

        // Clean up old data
        await cleanupOldData();

        // Generate recommendations
        stats.recommendations = await generateRecommendations(stats);

        // Print summary
        console.log('\n📋 Optimization Summary:');
        console.log(`  Indexes created: ${stats.indexesCreated}`);
        console.log(`  Slow queries found: ${stats.slowQueries.length}`);
        console.log(`  Data integrity: ${isDataValid ? '✅ Valid' : '❌ Issues found'}`);
        console.log(`  Recommendations: ${stats.recommendations.length}`);

        if (stats.slowQueries.length > 0) {
            console.log('\n⚠️  Slow Queries:');
            stats.slowQueries.forEach(query => console.log(`  - ${query}`));
        }

        if (stats.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            stats.recommendations.forEach(rec => console.log(`  - ${rec}`));
        }

        console.log('\n🎉 Optimization completed successfully!');

    } catch (error) {
        console.error('💥 Optimization failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run optimization if called directly
if (require.main === module) {
    runOptimization().catch(console.error);
}

export { runOptimization };