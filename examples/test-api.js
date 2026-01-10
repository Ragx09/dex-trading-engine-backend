const API_URL = 'http://localhost:3000/api';

async function testEndpoints() {
    try {
        console.log('Testing Health...');
        const healthRes = await fetch(`${API_URL}/health`);
        const health = await healthRes.json();
        console.log('Health:', health);

        console.log('\nTesting Metrics...');
        const metricsRes = await fetch(`${API_URL}/orders/metrics`);
        const metrics = await metricsRes.json();
        console.log('Metrics:', metrics);

        console.log('\nTesting Recent Orders...');
        const ordersRes = await fetch(`${API_URL}/orders`);
        const orders = await ordersRes.json();
        console.log('Recent Orders:', orders);

        if (orders.data && orders.data.length > 0) {
            const firstOrderId = orders.data[0].id;
            console.log(`\nTesting Specific Order (${firstOrderId})...`);
            const orderRes = await fetch(`${API_URL}/orders/${firstOrderId}`);
            const order = await orderRes.json();
            console.log('Order Details:', order);
        } else {
            console.log('\nNo orders found to test specific order endpoint.');
        }

        console.log('\nTesting Non-existent Order...');
        const nonExistentRes = await fetch(`${API_URL}/orders/non-existent-id`);
        if (nonExistentRes.status === 404) {
            console.log('Correctly returned 404 for non-existent order.');
        } else {
            console.error('Unexpected status for non-existent order:', nonExistentRes.status);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testEndpoints();
