import cron from "node-cron";
import dayjs from "dayjs"
import db from '../config/db.js';

cron.schedule('0 0 * * *', async () => {
    console.log(`⏰ Running daily user activity check... [${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`);

    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();

    try {
        const dbInstance = await db.getDB();
        const userCollection = await dbInstance.collection('user_login');
        const result = await userCollection.updateMany(
            { last_active_at: { $lt: thirtyDaysAgo } },
            { $set: { status: 'inactive' } }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ Updated ${result.modifiedCount} users to inactive.`);
        }
        console.log('✅ User status checker processing complete.');
    } catch (error) {
        console.error('❌ Failed to update user activity:', error.message);
    }
});