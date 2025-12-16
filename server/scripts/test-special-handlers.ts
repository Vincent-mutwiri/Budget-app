
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { processSpecialContribution } from '../services/transferService';
import { Account } from '../models/Account';
import { Debt } from '../models/Debt';
import { Investment } from '../models/Investment';
import { SavingsGoal } from '../models/SavingsGoal';
import { Transaction } from '../models/Transaction';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-app';

async function runTest() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Setup Test User
        const testUserId = 'test-special-user-' + Date.now();
        console.log(`Creating test user: ${testUserId}`);

        const currentAccount = new Account({
            userId: testUserId,
            name: 'Current Account',
            type: 'asset',
            accountCategory: 'current',
            balance: 10000,
            isMain: false
        });
        await currentAccount.save();

        // 2. Test Debt Payment
        console.log('\n--- Testing Debt Payment ---');
        const debt = new Debt({
            userId: testUserId,
            name: 'Test Debt',
            type: 'personal_loan',
            originalAmount: 5000,
            totalAmount: 5000, // Kept for safety if schema has it, but originalAmount is the key
            currentBalance: 5000, // Owe 5000
            interestRate: 5,
            minimumPayment: 100,
            dueDate: new Date(Date.now() + 86400000) // Tomorrow
        });
        await debt.save();

        await processSpecialContribution(testUserId, 'debt', debt._id.toString(), 1000, 'Debt Payment');

        const updatedDebt = await Debt.findById(debt._id);
        const updatedAccountAfterDebt = await Account.findById(currentAccount._id);

        console.log(`Debt Balance: ${updatedDebt?.currentBalance} (Expected: 4000)`);
        console.log(`Account Balance: ${updatedAccountAfterDebt?.balance} (Expected: 9000)`);

        if (updatedDebt?.currentBalance === 4000 && updatedAccountAfterDebt?.balance === 9000) {
            console.log('✅ Debt Payment Passed');
        } else {
            console.error('❌ Debt Payment Failed');
        }

        // 3. Test Investment Contribution
        console.log('\n--- Testing Investment Contribution ---');
        const investment = new Investment({
            userId: testUserId,
            name: 'Test Investment',
            type: 'stock',
            currentValue: 1000,
            initialAmount: 1000,
            ratePerAnnum: 5,
            purchaseDate: new Date()
        });
        await investment.save();

        await processSpecialContribution(testUserId, 'investment', investment._id.toString(), 2000, 'Buy Stocks');

        const updatedInvestment = await Investment.findById(investment._id);
        const updatedAccountAfterInv = await Account.findById(currentAccount._id);

        console.log(`Investment Value: ${updatedInvestment?.currentValue} (Expected: 3000)`);
        console.log(`Account Balance: ${updatedAccountAfterInv?.balance} (Expected: 7000)`);

        if (updatedInvestment?.currentValue === 3000 && updatedAccountAfterInv?.balance === 7000) {
            console.log('✅ Investment Contribution Passed');
        } else {
            console.error('❌ Investment Contribution Failed');
        }

        // 4. Test Goal Contribution
        console.log('\n--- Testing Goal Contribution ---');
        const goal = new SavingsGoal({
            userId: testUserId,
            title: 'Test Goal',
            targetAmount: 5000,
            currentAmount: 0,
            deadline: new Date()
        });
        await goal.save();

        await processSpecialContribution(testUserId, 'goal', goal._id.toString(), 500, 'Save for Goal');

        const updatedGoal = await SavingsGoal.findById(goal._id);
        const updatedAccountAfterGoal = await Account.findById(currentAccount._id);

        console.log(`Goal Amount: ${updatedGoal?.currentAmount} (Expected: 500)`);
        console.log(`Account Balance: ${updatedAccountAfterGoal?.balance} (Expected: 6500)`);

        if (updatedGoal?.currentAmount === 500 && updatedAccountAfterGoal?.balance === 6500) {
            console.log('✅ Goal Contribution Passed');
        } else {
            console.error('❌ Goal Contribution Failed');
        }

        // 5. Cleanup
        console.log('\nCleaning up...');
        await Account.deleteMany({ userId: testUserId });
        await Debt.deleteMany({ userId: testUserId });
        await Investment.deleteMany({ userId: testUserId });
        await SavingsGoal.deleteMany({ userId: testUserId });
        await Transaction.deleteMany({ userId: testUserId });
        console.log('Cleanup complete');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
