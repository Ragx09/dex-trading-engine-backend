import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'dex_orders',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
    logger.error({ err }, 'Unexpected error on idle client');
});

export async function query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug({ text, duration, rows: res.rowCount }, 'Executed query');
        return res;
    } catch (error) {
        logger.error({ error, text }, 'Database query error');
        throw error;
    }
}

export async function getClient(): Promise<PoolClient> {
    return await pool.connect();
}

export async function initDatabase(): Promise<void> {
    try {
        // Create orders table
        await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        token_in VARCHAR(255) NOT NULL,
        token_out VARCHAR(255) NOT NULL,
        amount_in DECIMAL NOT NULL,
        slippage DECIMAL NOT NULL,
        status VARCHAR(50) NOT NULL,
        selected_dex VARCHAR(50),
        executed_price DECIMAL,
        tx_hash VARCHAR(255),
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create index on status and created_at
        await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `);

        await query(`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
    `);

        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to initialize database');
        throw error;
    }
}

export default pool;
