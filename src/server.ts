import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { logger } from './utils/logger';
import { initDatabase } from './config/database';
import { orderRoutes } from './routes/orders';
import './services/orderWorker'; // Start the worker

const PORT = parseInt(process.env.PORT || '3000');
const HOST = '0.0.0.0';

/**
 * Create and configure Fastify server
 */
const server = Fastify({
    logger: logger,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
});

/**
 * Initialize server
 */
async function start() {
    try {
        // Register plugins
        await server.register(cors, {
            origin: true,
        });

        await server.register(websocket);

        // Initialize database
        await initDatabase();
        logger.info('Database initialized');

        // Register routes
        await server.register(orderRoutes);
        logger.info('Routes registered');

        // Start server
        await server.listen({ port: PORT, host: HOST });
        logger.info(`Server listening on ${HOST}:${PORT}`);

        // Log environment info
        logger.info({
            nodeEnv: process.env.NODE_ENV,
            mockMode: process.env.MOCK_MODE === 'true',
            concurrency: process.env.QUEUE_CONCURRENCY || '10',
            maxRate: process.env.QUEUE_MAX_RATE || '100',
        }, 'Server configuration');

    } catch (error) {
        logger.error({ error }, 'Failed to start server');
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down gracefully');

    try {
        await server.close();
        logger.info('Server closed');
        process.exit(0);
    } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
start();
