import EventEmitter from 'events';
import { WebSocketMessage } from '../models/types';

class OrderEventEmitter extends EventEmitter {
    emitOrderUpdate(message: WebSocketMessage) {
        this.emit('orderUpdate', message);
    }

    onOrderUpdate(handler: (message: WebSocketMessage) => void) {
        this.on('orderUpdate', handler);
    }

    removeOrderUpdateListener(handler: (message: WebSocketMessage) => void) {
        this.removeListener('orderUpdate', handler);
    }
}

export const orderEvents = new OrderEventEmitter();
