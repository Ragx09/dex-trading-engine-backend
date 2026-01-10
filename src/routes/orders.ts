import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Order, OrderRequest } from '../models/types';
import { generateOrderId } from '../utils/helpers';
import { saveOrder, getRecentOrders, getOrderById } from '../database/orderRepository';
import { addOrderToQueue, getQueueMetrics } from '../services/orderQueue';
import WebSocketManager from '../services/websocket';
import logger from '../utils/logger';

export async function orderRoutes(fastify: FastifyInstance) {
    /**
     * GET /api/orders
     * Get recent orders
     */
    fastify.get('/api/orders', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const orders = await getRecentOrders(10);
            return reply.send({
                success: true,
                data: orders,
            });
        } catch (error: any) {
            logger.error({ error }, 'Failed to get recent orders');
            return reply.status(500).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * GET /api/orders/:orderId
     * Get specific order details
     */
    fastify.get('/api/orders/:orderId', async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
        try {
            const { orderId } = request.params;
            const order = await getOrderById(orderId);

            if (!order) {
                return reply.status(404).send({
                    success: false,
                    error: 'Order not found',
                });
            }

            return reply.send({
                success: true,
                data: order,
            });
        } catch (error: any) {
            logger.error({ error }, 'Failed to get order');
            return reply.status(500).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * POST /api/orders
     * Create a new order
     */
    fastify.post('/api/orders', async (request: FastifyRequest<{ Body: OrderRequest }>, reply: FastifyReply) => {
        try {
            const body = request.body;
            const orderId = generateOrderId();

            const order: Order = {
                id: orderId,
                type: body.type,
                tokenIn: body.tokenIn,
                tokenOut: body.tokenOut,
                amountIn: body.amountIn,
                slippage: body.slippage || 0.01,
                targetPrice: body.targetPrice,
                activationDate: body.activationDate,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await saveOrder(order);
            await addOrderToQueue({ orderId, order });

            logger.info({ orderId, type: order.type }, 'Order created and queued');

            return reply.send({
                success: true,
                data: { orderId }
            });

        } catch (error: any) {
            logger.error({ error }, 'Failed to create order');
            return reply.status(500).send({
                success: false,
                error: error.message,
            });
        }
    });

    // WebSocket route for order updates
    fastify.register(async function (fastify) {
        fastify.get('/api/orders/execute', { websocket: true }, (connection: any, req: FastifyRequest) => {
            const socket = connection.socket || connection;

            // Allow subscription via query param: ?orderId=123
            const query = req.query as { orderId?: string };
            if (query.orderId) {
                WebSocketManager.register(query.orderId, socket);
                logger.info({ orderId: query.orderId }, 'WebSocket client subscribed via query param');
            }

            socket.on('message', async (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString());

                    // Allow subscription via message: { "type": "subscribe", "orderId": "123" }
                    if (data.type === 'subscribe' && data.orderId) {
                        WebSocketManager.register(data.orderId, socket);
                        logger.info({ orderId: data.orderId }, 'WebSocket client subscribed via message');
                        socket.send(JSON.stringify({ type: 'subscribed', orderId: data.orderId }));
                    }
                } catch (err) {
                    logger.error({ err }, 'WebSocket message error');
                }
            });

            socket.on('error', (err: Error) => {
                logger.error({ err }, 'WebSocket error');
            });
        });
    });

    /**
     * GET /api/orders/metrics
     * Get queue metrics
     */
    fastify.get('/api/orders/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const metrics = await getQueueMetrics();
            return reply.send({
                success: true,
                data: metrics,
            });
        } catch (error: any) {
            logger.error({ error }, 'Failed to get queue metrics');
            return reply.status(500).send({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * GET /api/health
     * Health check endpoint
     */
    fastify.get('/api/health', async (_request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
            status: 'healthy',
            timestamp: new Date(),
            service: 'dex-order-execution-engine',
        });
    });
}