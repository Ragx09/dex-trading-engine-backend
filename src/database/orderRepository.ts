import { query } from '../config/database';
import { Order, OrderStatus } from '../models/types';
import { logger } from '../utils/logger';

/**
 * Save a new order to the database
 */
export async function saveOrder(order: Order): Promise<void> {
    try {
        await query(
            `INSERT INTO orders (id, type, token_in, token_out, amount_in, slippage, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                order.id,
                order.type,
                order.tokenIn,
                order.tokenOut,
                order.amountIn,
                order.slippage,
                order.status,
                order.createdAt,
                order.updatedAt,
            ]
        );

        logger.debug({ orderId: order.id }, 'Order saved to database');
    } catch (error) {
        logger.error({ error, orderId: order.id }, 'Failed to save order');
        throw error;
    }
}

/**
 * Update an existing order in the database
 */
export async function updateOrderInDB(
    orderId: string,
    updates: Partial<{
        status: OrderStatus;
        selectedDex: string;
        executedPrice: number;
        txHash: string;
        error: string;
    }>
): Promise<void> {
    try {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.status) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(updates.status);
        }

        if (updates.selectedDex) {
            setClauses.push(`selected_dex = $${paramIndex++}`);
            values.push(updates.selectedDex);
        }

        if (updates.executedPrice !== undefined) {
            setClauses.push(`executed_price = $${paramIndex++}`);
            values.push(updates.executedPrice);
        }

        if (updates.txHash) {
            setClauses.push(`tx_hash = $${paramIndex++}`);
            values.push(updates.txHash);
        }

        if (updates.error) {
            setClauses.push(`error = $${paramIndex++}`);
            values.push(updates.error);
        }

        setClauses.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());

        values.push(orderId);

        await query(
            `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        logger.debug({ orderId, updates }, 'Order updated in database');
    } catch (error) {
        logger.error({ error, orderId, updates }, 'Failed to update order');
        throw error;
    }
}

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
    try {
        const result = await query('SELECT * FROM orders WHERE id = $1', [orderId]);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            type: row.type,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amountIn: parseFloat(row.amount_in),
            slippage: parseFloat(row.slippage),
            status: row.status,
            selectedDex: row.selected_dex,
            executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
            txHash: row.tx_hash,
            error: row.error,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    } catch (error) {
        logger.error({ error, orderId }, 'Failed to get order');
        throw error;
    }
}

/**
 * Get recent orders
 */
export async function getRecentOrders(limit: number = 50): Promise<Order[]> {
    try {
        const result = await query(
            'SELECT * FROM orders ORDER BY created_at DESC LIMIT $1',
            [limit]
        );

        return result.rows.map((row: any) => ({
            id: row.id,
            type: row.type,
            tokenIn: row.token_in,
            tokenOut: row.token_out,
            amountIn: parseFloat(row.amount_in),
            slippage: parseFloat(row.slippage),
            status: row.status,
            selectedDex: row.selected_dex,
            executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
            txHash: row.tx_hash,
            error: row.error,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    } catch (error) {
        logger.error({ error }, 'Failed to get recent orders');
        throw error;
    }
}
