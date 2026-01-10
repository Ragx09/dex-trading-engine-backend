import { Queue } from 'bullmq';
import redis from '../config/redis';
import { OrderJobData } from '../models/types';
import { logger } from '../utils/logger';

/**
 * BullMQ Queue for processing orders
 * Handles concurrent order processing with rate limiting
 */
export const orderQueue = new Queue<OrderJobData>('order-execution', {
    connection: redis as any,
    defaultJobOptions: {
        attempts: parseInt(process.env.MAX_RETRIES || '3'),
        backoff: {
            type: 'exponential',
            delay: parseInt(process.env.RETRY_DELAY || '1000'),
        },
        removeOnComplete: {
            count: 1000, // Keep last 1000 completed jobs
            age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
            count: 5000, // Keep last 5000 failed jobs for analysis
        },
    },
});

orderQueue.on('error', (err) => {
    logger.error({ err }, 'Queue error');
});

/**
 * Add an order to the processing queue
 */
import { JobsOptions } from 'bullmq';

/**
 * Add an order to the processing queue
 */
export async function addOrderToQueue(jobData: OrderJobData, opts?: JobsOptions): Promise<string> {
    try {
        const job = await orderQueue.add('execute-order', jobData, {
            jobId: jobData.orderId,
            ...opts
        });

        logger.info({ orderId: jobData.orderId, jobId: job.id }, 'Order added to queue');
        return job.id || jobData.orderId;
    } catch (error) {
        logger.error({ error, orderId: jobData.orderId }, 'Failed to add order to queue');
        throw error;
    }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
        orderQueue.getWaitingCount(),
        orderQueue.getActiveCount(),
        orderQueue.getCompletedCount(),
        orderQueue.getFailedCount(),
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
    };
}

export default orderQueue;
