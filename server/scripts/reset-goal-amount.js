require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

const SavingsGoalSchema = new mongoose.Schema({
    userId: String,
    title: String,
    targetAmount: Number,
    currentAmount: Number,
    deadline: Date,
    imageUrl: String,
    status: String,
    contributions: [{
        amount: Number,
        date: Date,
        note: String
    }],
    createdAt: Date,
    updatedAt: Date
});

const SavingsGoal = mongoose.model('SavingsGoal', SavingsGoalSchema);

async function resetGoalAmount() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const result = await SavingsGoal.updateOne(
            { title: 'Kelvin School Fees' },
            { 
                $set: { 
                    currentAmount: 0,
                    contributions: []
                } 
            }
        );

        if (result.matchedCount === 0) {
            console.log('❌ Goal "Kelvin School Fees" not found');
        } else {
            console.log('✅ Reset "Kelvin School Fees" goal:');
            console.log('   - Current amount set to: KSh 0');
            console.log('   - Contributions cleared');
        }
        
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetGoalAmount();
