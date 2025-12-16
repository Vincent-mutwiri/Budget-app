require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');

async function testSync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const userId = 'user_36A0fVH5XsEsl2znQOnyZMdXg5L';
        
        const { syncMainAccountBalance, syncCurrentAccountBalance, getMainAccount, getCurrentAccount } = require('../dist/services/accountService');
        
        console.log('Before sync:');
        const mainBefore = await getMainAccount(userId);
        const currentBefore = await getCurrentAccount(userId);
        console.log('Main:', mainBefore?.balance);
        console.log('Current:', currentBefore?.balance);
        
        console.log('\nSyncing...');
        await syncMainAccountBalance(userId);
        await syncCurrentAccountBalance(userId);
        
        console.log('\nAfter sync:');
        const mainAfter = await getMainAccount(userId);
        const currentAfter = await getCurrentAccount(userId);
        console.log('Main:', mainAfter?.balance);
        console.log('Current:', currentAfter?.balance);
        
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSync();
