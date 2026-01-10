const WebSocket = require('ws');
const readline = require('readline');

const SERVER_URL = 'ws://localhost:3000/api/orders/execute';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function promptOrder() {
    console.log('\n=== DEX Order Execution Engine - WebSocket Client ===\n');

    rl.question('Token In (e.g., SOL): ', (tokenIn) => {
        rl.question('Token Out (e.g., USDC): ', (tokenOut) => {
            rl.question('Amount In: ', (amountIn) => {
                rl.question('Slippage (0.01 for 1%): ', (slippage) => {

                    const orderRequest = {
                        type: 'market',
                        tokenIn: tokenIn || 'SOL',
                        tokenOut: tokenOut || 'USDC',
                        amountIn: parseFloat(amountIn) || 1,
                        slippage: parseFloat(slippage) || 0.01
                    };

                    console.log('\nSubmitting order:', orderRequest);
                    submitOrder(orderRequest);
                });
            });
        });
    });
}

function submitOrder(orderRequest) {
    const ws = new WebSocket(SERVER_URL);

    ws.on('open', () => {
        console.log('\n✓ Connected to server');
        console.log('Sending order request...\n');

        // Note: For WebSocket route, we need to send the order as message
        // In production, this would typically be sent as part of the HTTP upgrade
        ws.send(JSON.stringify(orderRequest));
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            if (message.error) {
                console.error('❌ Error:', message.error);
                ws.close();
                return;
            }

            if (message.orderId) {
                console.log(`📝 Order ID: ${message.orderId}`);
            }

            if (message.status) {
                displayStatusUpdate(message);
            }

            // Check if this is a final status
            if (message.status === 'confirmed' || message.status === 'failed') {
                console.log('\n✓ Order processing complete');
                setTimeout(() => {
                    ws.close();
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to parse message:', error.message);
        }
    });

    ws.on('close', () => {
        console.log('\n✓ Connection closed');

        rl.question('\nSubmit another order? (y/n): ', (answer) => {
            if (answer.toLowerCase() === 'y') {
                promptOrder();
            } else {
                rl.close();
                process.exit(0);
            }
        });
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        rl.close();
        process.exit(1);
    });
}

function displayStatusUpdate(message) {
    const timestamp = new Date(message.timestamp).toLocaleTimeString();

    console.log(`\n[${timestamp}] Status: ${message.status.toUpperCase()}`);

    if (message.data) {
        if (message.data.quotes) {
            console.log('\n  DEX Quotes:');
            message.data.quotes.forEach(quote => {
                console.log(`    ${quote.dex.toUpperCase()}:`);
                console.log(`      Price: ${quote.price}`);
                console.log(`      Amount Out: ${quote.amountOut}`);
                console.log(`      Fee: ${(quote.fee * 100).toFixed(2)}%`);
            });
        }

        if (message.data.selectedDex) {
            console.log(`  Selected DEX: ${message.data.selectedDex.toUpperCase()}`);
        }

        if (message.data.executedPrice) {
            console.log(`  Executed Price: ${message.data.executedPrice}`);
        }

        if (message.data.txHash) {
            console.log(`  Transaction Hash: ${message.data.txHash}`);
        }

        if (message.data.error) {
            console.log(`  Error: ${message.data.error}`);
        }
    }
}

// Start the client
console.log('Starting WebSocket Client...');
console.log('Make sure the server is running on http://localhost:3000\n');

promptOrder();
