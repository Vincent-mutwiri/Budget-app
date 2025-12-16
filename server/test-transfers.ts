import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from './models/User';
import { Account } from './models/Account';
import { Debt } from './models/Debt';
import { Investment } from './models/Investment';
import { ensureMainAccount, ensureCurrentAccount } from './services/accountService';
import { borrowFromMain, repayToMain, processSpecialContribution, withdrawFromSpecial } from './services/transferService';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
}

async function runTest() {
    try {
        await mongoose.connect(MONGODB_URI!);
        console.log('Connected to MongoDB');

        const testUserId = 'test_transfer_user_' + Date.now();

        // 1. Create User and Accounts
        const user = new User({
            clerkId: testUserId,
            email: 'test@example.com',
            fullName: 'Test User'
        });
        await user.save();

        const mainAccountId = await ensureMainAccount(testUserId);
        const currentAccountId = await ensureCurrentAccount(testUserId);

        const mainAccount = await Account.findById(mainAccountId);
        const currentAccount = await Account.findById(currentAccountId);

        if (!mainAccount || !currentAccount) throw new Error('Accounts not created');

        // Set initial balances
        mainAccount.balance = 5000;
        await mainAccount.save();

        currentAccount.balance = 1000;
        await currentAccount.save();

        console.log('Initial Balances:', {
            Main: mainAccount.balance,
            Current: currentAccount.balance
        });

        // 2. Test Borrow from Main (Main -> Current)
        console.log('\n--- Testing Borrow from Main ---');
        await borrowFromMain(testUserId, 500, 'Emergency Fund');

        const afterBorrowMain = await Account.findById(mainAccountId);
        const afterBorrowCurrent = await Account.findById(currentAccountId);

        console.log('After Borrow:', {
            Main: afterBorrowMain?.balance,
            Current: afterBorrowCurrent?.balance
        });

        if (afterBorrowMain?.balance !== 4500 || afterBorrowCurrent?.balance !== 1500) {
            throw new Error('Borrow failed balance check');
        }

        // 3. Test Repay to Main (Current -> Main)
        console.log('\n--- Testing Repay to Main ---');
        await repayToMain(testUserId, 200, 'Repayment');

        const afterRepayMain = await Account.findById(mainAccountId);
        const afterRepayCurrent = await Account.findById(currentAccountId);

        console.log('After Repay:', {
            Main: afterRepayMain?.balance,
            Current: afterRepayCurrent?.balance
        });

        if (afterRepayMain?.balance !== 4700 || afterRepayCurrent?.balance !== 1300) {
            throw new Error('Repay failed balance check');
        }

        // 4. Test Contribute to Debt (Main -> Debt)
        console.log('\n--- Testing Contribute to Debt (from Main) ---');
        const debt = new Debt({
            userId: testUserId,
            name: 'Test Debt',
            type: 'credit_card',
            currentBalance: 1000,
            originalAmount: 1000,
            interestRate: 5,
            minimumPayment: 50,
            dueDate: new Date()
        });
        await debt.save();

        await processSpecialContribution(testUserId, 'debt', debt._id.toString(), 300, 'Extra Payment');

        const afterContributeMain = await Account.findById(mainAccountId);
        const afterContributeDebt = await Debt.findById(debt._id);

        console.log('After Contribute:', {
            Main: afterContributeMain?.balance,
            Debt: afterContributeDebt?.currentBalance
        });

        // Main should decrease by 300 (4700 -> 4400)
        // Debt should decrease by 300 (1000 -> 700)
        if (afterContributeMain?.balance !== 4400) throw new Error('Contribute failed Main Account check');
        if (afterContributeDebt?.currentBalance !== 700) throw new Error('Contribute failed Debt check');

        // 5. Test Withdraw from Investment (Investment -> Current)
        console.log('\n--- Testing Withdraw from Investment (to Current) ---');
        const investment = new Investment({
            userId: testUserId,
            name: 'Test Stock',
            type: 'stock',
            initialAmount: 1000,
            currentValue: 1200,
            ratePerAnnum: 5,
            purchaseDate: new Date()
        });
        await investment.save();

        await withdrawFromSpecial(testUserId, 'investment', investment._id.toString(), 200, 'Cash Out');

        const afterWithdrawCurrent = await Account.findById(currentAccountId);
        const afterWithdrawInvestment = await Investment.findById(investment._id);

        console.log('After Withdraw:', {
            Current: afterWithdrawCurrent?.balance,
            Investment: afterWithdrawInvestment?.currentValue
        });

        // Current should increase by 200 (1300 -> 1500)
        if (afterWithdrawCurrent?.balance !== 1500) throw new Error('Withdraw failed Current Account check');
        // Investment should decrease by 200 (1200 -> 1000)
        if (afterWithdrawInvestment?.currentValue !== 1000) throw new Error('Withdraw failed Investment check');

        console.log('\n✅ All Tests Passed!');

        // Cleanup
        await User.deleteOne({ clerkId: testUserId });
        await Account.deleteMany({ userId: testUserId });
        await Debt.deleteOne({ _id: debt._id });
        await Investment.deleteOne({ _id: investment._id });

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
