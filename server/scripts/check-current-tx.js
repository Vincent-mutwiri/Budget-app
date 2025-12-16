require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const CurrentTransaction = mongoose.model('CurrentTransaction', new mongoose.Schema({}, { strict: false }));
    const Transfer = mongoose.model('Transfer', new mongoose.Schema({}, { strict: false }));
    
    const userId = 'user_36A0fVH5XsEsl2znQOnyZMdXg5L';
    
    const income = await CurrentTransaction.find({ userId, type: 'income' });
    const expenses = await CurrentTransaction.find({ userId, type: 'expense' });
    const transfers = await Transfer.find({ userId });
    
    console.log('Income transactions:', income.length);
    console.log('Total income:', income.reduce((s, t) => s + t.amount, 0));
    
    console.log('\nExpense transactions:', expenses.length);
    console.log('Total expenses:', expenses.reduce((s, t) => s + t.amount, 0));
    
    console.log('\nTransfers:', transfers.length);
    transfers.forEach(t => {
        console.log(`  ${t.fromAccount} -> ${t.toAccount}: ${t.amount} (${t.type})`);
    });
    
    await mongoose.connection.close();
}

check();
