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

async function fixBudgetMonths() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Find budgets without month/year fields
        const budgetsWithoutMonth = await Budget.find({
            $or: [
                { month: { $exists: false } },
                { year: { $exists: false } }
            ]
        });

        console.log(`Found ${budgetsWithoutMonth.length} budgets without month/year fields`);

        if (budgetsWithoutMonth.length === 0) {
            console.log('All budgets already have month/year fields');
            await mongoose.disconnect();
            return;
        }

        // Update each budget to add current month/year
        for (const budget of budgetsWithoutMonth) {
            budget.month = currentMonth;
            budget.year = currentYear;
            budget.isTemplate = false;
            await budget.save();
        }

        console.log(`✅ Updated ${budgetsWithoutMonth.length} budgets with month: ${currentMonth}, year: ${currentYear}`);

        // Verify the fix
        const currentMonthBudgets = await Budget.find({ month: currentMonth, year: currentYear });
        const totalLimit = currentMonthBudgets.reduce((sum, b) => sum + b.limit, 0);
        
        console.log(`\nCurrent month (${currentMonth}/${currentYear}) budgets: ${currentMonthBudgets.length}`);
        console.log(`Total Planned Budget: KSh ${totalLimit.toLocaleString()}`);

        await mongoose.disconnect();
        console.log('\n✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

fixBudgetMonths();
