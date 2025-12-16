const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const BudgetSchema = new mongoose.Schema({
    userId: String,
    category: String,
    limit: Number,
    spent: Number,
    icon: String,
    month: Number,
    year: Number,
    isTemplate: Boolean,
    createdAt: Date,
    updatedAt: Date
});

const Budget = mongoose.model('Budget', BudgetSchema);

async function removeDuplicateBudgets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const budgets = await Budget.find({ month: currentMonth, year: currentYear }).sort({ createdAt: 1 });
        
        console.log(`Found ${budgets.length} budgets for ${currentMonth}/${currentYear}`);
        console.log(`Total before cleanup: KSh ${budgets.reduce((sum, b) => sum + b.limit, 0).toLocaleString()}`);

        // Group by userId and category
        const grouped = {};
        budgets.forEach(b => {
            const key = `${b.userId}_${b.category}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(b);
        });

        let deletedCount = 0;
        const toDelete = [];

        // For each group, keep only the first one (oldest by createdAt)
        Object.values(grouped).forEach(group => {
            if (group.length > 1) {
                // Keep the first, delete the rest
                for (let i = 1; i < group.length; i++) {
                    toDelete.push(group[i]._id);
                    deletedCount++;
                }
            }
        });

        if (toDelete.length > 0) {
            await Budget.deleteMany({ _id: { $in: toDelete } });
            console.log(`\n✅ Deleted ${deletedCount} duplicate budgets`);
        } else {
            console.log('\n✅ No duplicates found');
        }

        // Verify the result
        const remainingBudgets = await Budget.find({ month: currentMonth, year: currentYear });
        const totalLimit = remainingBudgets.reduce((sum, b) => sum + b.limit, 0);
        
        console.log(`\nRemaining budgets: ${remainingBudgets.length}`);
        console.log(`Total Planned Budget: KSh ${totalLimit.toLocaleString()}`);

        await mongoose.disconnect();
        console.log('\n✅ Cleanup completed successfully');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
}

removeDuplicateBudgets();
