import { query } from './src/config/database';

async function verify() {
    try {
        const result = await query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'order_type'
        `);

        if (result.rows.length > 0) {
            console.log('✅ Column exists!');
            console.log(result.rows[0]);
        } else {
            console.log('❌ Column not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verify();