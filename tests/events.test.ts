import { orderEvents } from '../src/utils/events';
import { WebSocketMessage, OrderStatus } from '../src/models/types';

describe('Order Events', () => {
    it('should emit and receive order updates', (done) => {
        const testMessage: WebSocketMessage = {
            orderId: 'test-order-123',
            status: 'confirmed' as OrderStatus,
            data: {
                txHash: '1234567890abcdef',
                executedPrice: 100.5,
            },
            timestamp: new Date(),
        };

        const handler = (message: WebSocketMessage) => {
            expect(message.orderId).toBe(testMessage.orderId);
            expect(message.status).toBe(testMessage.status);
            expect(message.data?.txHash).toBe(testMessage.data?.txHash);
            expect(message.data?.executedPrice).toBe(testMessage.data?.executedPrice);

            orderEvents.removeOrderUpdateListener(handler);
            done();
        };

        orderEvents.onOrderUpdate(handler);
        orderEvents.emitOrderUpdate(testMessage);
    });

    it('should support multiple listeners', (done) => {
        const testMessage: WebSocketMessage = {
            orderId: 'test-order-456',
            status: 'pending' as OrderStatus,
            timestamp: new Date(),
        };

        let count = 0;
        const checkDone = () => {
            count++;
            if (count === 2) {
                orderEvents.removeOrderUpdateListener(handler1);
                orderEvents.removeOrderUpdateListener(handler2);
                done();
            }
        };

        const handler1 = (message: WebSocketMessage) => {
            expect(message.orderId).toBe(testMessage.orderId);
            checkDone();
        };

        const handler2 = (message: WebSocketMessage) => {
            expect(message.orderId).toBe(testMessage.orderId);
            checkDone();
        };

        orderEvents.onOrderUpdate(handler1);
        orderEvents.onOrderUpdate(handler2);
        orderEvents.emitOrderUpdate(testMessage);
    });

    it('should remove listeners correctly', (done) => {
        const testMessage: WebSocketMessage = {
            orderId: 'test-order-789',
            status: 'failed' as OrderStatus,
            timestamp: new Date(),
        };

        let handlerCalled = false;

        const handler = () => {
            handlerCalled = true;
        };

        orderEvents.onOrderUpdate(handler);
        orderEvents.removeOrderUpdateListener(handler);
        orderEvents.emitOrderUpdate(testMessage);

        setTimeout(() => {
            expect(handlerCalled).toBe(false);
            done();
        }, 100);
    });
});
