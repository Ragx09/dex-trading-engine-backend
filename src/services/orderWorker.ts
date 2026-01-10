import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import { OrderJobData, OrderStatus, WebSocketMessage } from '../models/types';
import { logger } from '../utils/logger';
import { orderEvents } from '../utils/events';
import dexRouter from './dexRouter';
import { updateOrderInDB } from '../database/orderRepository';
import { addOrderToQueue } from './orderQueue'; // Import addOrderToQueue
import fs from 'fs';
import path from 'path';

/**
 * BullMQ Worker for processing order execution jobs
 * Handles the complete order lifecycle from routing to execution
 */
export const orderWorker = new Worker<OrderJobData>(
    'order-execution',
    async (job: Job<OrderJobData>) => {
        const { orderId, order } = job.data;
        const debugPath = path.join(process.cwd(), 'server-debug.txt');

        fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Worker processing order: ${orderId} (${order.type})\n`);
        logger.info({ orderId, type: order.type, attempt: job.attemptsMade }, 'Processing order');

        try {
            // Step 1: Check conditions for Limit/Sniper orders
            if (order.type !== 'market') {
                try {
                    // Try to get a route first
                    const routingDecision = await dexRouter.getBestRoute(
                        order.tokenIn,
                        order.tokenOut,
                        order.amountIn
                    );

                    // If Sniper: access means pool exists -> Execute
                    // If Limit: check price
                    if (order.type === 'limit' && order.targetPrice) {
                        const bestPrice = Math.max(
                            routingDecision.raydiumQuote?.price || 0,
                            routingDecision.meteoraQuote?.price || 0
                        );

                        // Execute if Current Price < Target Price (Buy Limit logic)
                        if (bestPrice < order.targetPrice) {
                            logger.info({ orderId, currentPrice: bestPrice, targetPrice: order.targetPrice }, 'Limit price not met, requeueing');

                            // Requeue with delay
                            await addOrderToQueue({ orderId, order }, { delay: 5000 });
                            return { status: 'requeued', reason: 'Price not met' };
                        }
                    }

                } catch (err: any) {
                    if (order.type === 'sniper' && err.message.includes('No pool found')) {
                        // Pool doesn't exist yet -> Requeue
                        logger.info({ orderId }, 'Pool not found for Sniper order, requeueing');

                        await addOrderToQueue({ orderId, order }, { delay: 2000 });
                        return { status: 'requeued', reason: 'Pool not found' };
                    }
                    throw err; // Other errors should fail/retry
                }
            }

            // ... Standard Execution Logic ...

            // Step 1: Routing (Already done for Limit/Sniper above, but safe to redo or reuse)
            await emitStatus(orderId, 'routing');
            const routingDecision = await dexRouter.getBestRoute(
                order.tokenIn,
                order.tokenOut,
                order.amountIn
            );

            // Update order with selected DEX
            order.selectedDex = routingDecision.selectedDex;
            await updateOrderInDB(orderId, {
                status: 'routing',
                selectedDex: routingDecision.selectedDex,
            });

            // Emit routing decision
            await emitStatus(orderId, 'routing', {
                selectedDex: routingDecision.selectedDex,
                quotes: [routingDecision.raydiumQuote, routingDecision.meteoraQuote],
            });

            // Step 2: Building - Create transaction
            await emitStatus(orderId, 'building');
            await updateOrderInDB(orderId, { status: 'building' });

            // Step 3: Submitted - Send transaction to network
            await emitStatus(orderId, 'submitted');
            await updateOrderInDB(orderId, { status: 'submitted' });

            // Step 4: Execute the swap
            const result = await dexRouter.executeSwap(routingDecision.selectedDex, order);

            // Step 5: Confirmed - Transaction successful
            await updateOrderInDB(orderId, {
                status: 'confirmed',
                executedPrice: result.executedPrice,
                txHash: result.txHash,
            });

            await emitStatus(orderId, 'confirmed', {
                executedPrice: result.executedPrice,
                txHash: result.txHash,
                selectedDex: routingDecision.selectedDex,
            });

            logger.info(
                {
                    orderId,
                    txHash: result.txHash,
                    dex: routingDecision.selectedDex,
                    price: result.executedPrice,
                },
                'Order executed successfully'
            );

            return result;
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error occurred';
            fs.appendFileSync(debugPath, `[${new Date().toISOString()}] Worker error for ${orderId}: ${errorMessage}\nStack: ${error.stack}\n`);
            logger.error({ error, orderId, attempt: job.attemptsMade }, 'Order execution failed');

            // If this is the final attempt, mark as failed
            // Note: If we manually requeued (returned earlier), we don't reach here.
            // If we threw inside the try, we come here.

            if (job.attemptsMade >= (parseInt(process.env.MAX_RETRIES || '3'))) {
                await updateOrderInDB(orderId, {
                    status: 'failed',
                    error: errorMessage,
                });

                await emitStatus(orderId, 'failed', {
                    error: errorMessage,
                });

                logger.error({ orderId, error: errorMessage }, 'Order permanently failed after max retries');
            }

            throw error; // Re-throw to trigger retry
        }
    },
    {
        connection: redis as any,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10'),
        limiter: {
            max: parseInt(process.env.QUEUE_MAX_RATE || '100'),
            duration: parseInt(process.env.QUEUE_MAX_RATE_DURATION || '60000'),
        },
    }
);

/**
 * Emit order status update via event system
 */
async function emitStatus(orderId: string, status: OrderStatus, data?: any): Promise<void> {
    const message: WebSocketMessage = {
        orderId,
        status,
        data,
        timestamp: new Date(),
    };

    orderEvents.emitOrderUpdate(message);
    logger.debug({ orderId, status }, 'Emitted status update');
}

orderWorker.on('completed', (job) => {
    // If we marked it as requeued in the return value, we might want to log differently?
    // But BullMQ just sees 'completed'.
    const result = job.returnvalue;
    if (result && result.status === 'requeued') {
        logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Job requeued (limit/sniper wait)');
    } else {
        logger.info({ jobId: job.id, orderId: job.data.orderId }, 'Job completed');
    }
});

orderWorker.on('failed', (job, err) => {
    logger.error(
        { jobId: job?.id, orderId: job?.data.orderId, error: err.message },
        'Job failed'
    );
});

orderWorker.on('error', (err) => {
    logger.error({ err }, 'Worker error');
});

export default orderWorker;
