import { WebSocket } from 'ws';
import { orderEvents } from '../utils/events';
import { WebSocketMessage } from '../models/types';
import { logger } from '../utils/logger';

class WebSocketManager {
    private connections: Map<string, WebSocket> = new Map();

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        orderEvents.onOrderUpdate((message: WebSocketMessage) => {
            this.sendToClient(message.orderId, message);
        });
    }

    public register(orderId: string, socket: WebSocket) {
        this.connections.set(orderId, socket);

        socket.on('close', () => {
            this.connections.delete(orderId);
            logger.debug({ orderId }, 'WebSocket connection removed');
        });
    }

    public sendToClient(orderId: string, message: any) {
        const socket = this.connections.get(orderId);
        if (socket && socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify(message));
                logger.debug({ orderId, type: message.type }, 'Sent WebSocket message');
            } catch (error) {
                logger.error({ error, orderId }, 'Failed to send WebSocket message');
                this.connections.delete(orderId);
            }
        }
    }
}

export default new WebSocketManager();
