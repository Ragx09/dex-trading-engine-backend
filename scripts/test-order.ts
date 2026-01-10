import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/api/orders/execute');

ws.on('open', () => {
    console.log('Connected');
    const payload = {
        tokenIn: '0x1234567890123456789012345678901234567890',
        tokenOut: '0x0987654321098765432109876543210987654321',
        amount: 1000,
        orderType: 'market'
    };
    console.log('Sending:', JSON.stringify(payload));
    ws.send(JSON.stringify(payload));
});

ws.on('message', (data) => {
    console.log('Received:', data.toString());
    ws.close();
});

ws.on('error', (err) => {
    console.error('Error:', err);
});

ws.on('close', () => {
    console.log('Disconnected');
});
