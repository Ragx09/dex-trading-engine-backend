import { query } from './src/config/database';

async function runMigration() {
    try {
        await query(`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) NOT NULL DEFAULT 'market'
        `);
        console.log('✅ Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();