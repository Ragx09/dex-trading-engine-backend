
// Test WebSocket connection
// Usage: npx ts-node scripts/verify-ws.ts

const url = 'ws://localhost:3000/api/orders/execute';
console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.onopen = () => {
    console.log('Connected to WebSocket server successfully!');
    ws.close();
    process.exit(0);
};

ws.onerror = (event) => {
    console.error('WebSocket error:', event);
    process.exit(1);
};

ws.onclose = () => {
    console.log('Connection closed');
};
