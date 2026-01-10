const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost:3000/api/orders/execute';

// Test orders to submit
const testOrders = [
    { type: 'market', tokenIn: 'SOL', tokenOut: 'USDC', amountIn: 1, slippage: 0.01 },
    { type: 'market', tokenIn: 'SOL', tokenOut: 'USDT', amountIn: 2, slippage: 0.02 },
    { type: 'market', tokenIn: 'USDC', tokenOut: 'SOL', amountIn: 100, slippage: 0.01 },
    { type: 'market', tokenIn: 'SOL', tokenOut: 'BONK', amountIn: 0.5, slippage: 0.03 },
    { type: 'market', tokenIn: 'BONK', tokenOut: 'SOL', amountIn: 50000, slippage: 0.02 },
];

let completedOrders = 0;
const orderStatuses = new Map();

function submitOrder(orderRequest, index) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(SERVER_URL);

        console.log(`\n[Order ${index + 1}] Connecting...`);

        ws.on('open', () => {
            console.log(`[Order ${index + 1}] Connected, sending request`);
            ws.send(JSON.stringify(orderRequest));
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());

                if (message.error) {
                    console.error(`[Order ${index + 1}] ❌ Error: ${message.error}`);
                    ws.close();
                    reject(new Error(message.error));
                    return;
                }

                if (message.orderId) {
                    console.log(`[Order ${index + 1}] 📝 Order ID: ${message.orderId}`);
                    orderStatuses.set(message.orderId, []);
                }

                if (message.status) {
                    const orderId = message.orderId;
                    if (!orderStatuses.has(orderId)) {
                        orderStatuses.set(orderId, []);
                    }
                    orderStatuses.get(orderId).push(message.status);

                    console.log(`[Order ${index + 1}] Status: ${message.status.toUpperCase()}`);

                    if (message.data?.selectedDex) {
                        console.log(`[Order ${index + 1}]   Selected DEX: ${message.data.selectedDex}`);
                    }

                    if (message.data?.txHash) {
                        console.log(`[Order ${index + 1}]   TX Hash: ${message.data.txHash.substring(0, 16)}...`);
                    }

                    if (message.status === 'confirmed' || message.status === 'failed') {
                        completedOrders++;
                        console.log(`[Order ${index + 1}] ✓ ${message.status === 'confirmed' ? 'Completed' : 'Failed'}`);
                        setTimeout(() => ws.close(), 500);
                    }
                }
            } catch (error) {
                console.error(`[Order ${index + 1}] Parse error:`, error.message);
            }
        });

        ws.on('close', () => {
            console.log(`[Order ${index + 1}] Connection closed`);
            resolve();
        });

        ws.on('error', (error) => {
            console.error(`[Order ${index + 1}] ❌ WebSocket error:`, error.message);
            reject(error);
        });
    });
}

async function runTest() {
    console.log('=== DEX Order Execution Engine - Concurrent Test ===');
    console.log(`Submitting ${testOrders.length} orders concurrently...\n`);

    const startTime = Date.now();

    try {
        // Submit all orders concurrently
        await Promise.allSettled(
            testOrders.map((order, index) => submitOrder(order, index))
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n=== Test Summary ===');
        console.log(`Total Orders: ${testOrders.length}`);
        console.log(`Completed: ${completedOrders}`);
        console.log(`Duration: ${duration}s`);
        console.log(`\nOrder Status Lifecycle:`);

        for (const [orderId, statuses] of orderStatuses.entries()) {
            console.log(`  ${orderId}: ${statuses.join(' → ')}`);
        }

    } catch (error) {
        console.error('\nTest failed:', error.message);
        process.exit(1);
    }
}

// Start the test
runTest().then(() => {
    console.log('\n✓ Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
