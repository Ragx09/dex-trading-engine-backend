
# DEX Order Execution Engine

A production-ready order execution engine that processes market orders with intelligent DEX routing between Raydium and Meteora, real-time WebSocket updates, and robust queue management.

🔗 **Live Demo**: [Coming Soon - Deploy URL]  
📹 **Video Demo**: [Coming Soon - YouTube Link]  
📮 **API Collection**: [Postman Collection](./postman/DEX-Order-Engine.postman_collection.json)

## 🎯 Features

- **Market Order Execution**: Immediate execution at current market price
- **Smart DEX Routing**: Automatically compares Raydium and Meteora prices and routes to the best venue
- **Real-time Updates**: WebSocket streaming of order lifecycle status
- **Robust Queue System**: BullMQ-powered queue with 10 concurrent orders, 100 orders/minute throughput
- **Retry Logic**: Exponential backoff with up to 3 retry attempts
- **Order Persistence**: PostgreSQL for order history and post-mortem analysis
- **Comprehensive Testing**: 10+ unit and integration tests

## 📋 Order Type Selection: Market Orders

**Why Market Orders?**
Market orders provide immediate execution at the current best available price, making them ideal for demonstrating real-time DEX routing and WebSocket status updates. They offer:
- Immediate execution without waiting for price conditions
- Clear demonstration of DEX price comparison logic
- Straightforward testing and validation

**Extension to Other Order Types:**
- **Limit Orders**: Add a price monitor service that continuously compares current DEX prices against the user's target price, triggering execution when conditions are met.
- **Sniper Orders**: Implement a token launch detector that monitors new pool creation events, then immediately executes the swap upon detection with minimal latency.

## 🏗️ Architecture

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   Client    │──WS──→│  Fastify API │──→   BullMQ Queue   │
└─────────────┘       └──────────────┘       └─────────────┘
                             │                      │
                             ↓                      ↓
                      ┌──────────────┐       ┌─────────────┐
                      │  PostgreSQL  │       │   Worker    │
                      └──────────────┘       └─────────────┘
                                                    │
                        ┌───────────────────────────┴────────────────┐
                        ↓                                            ↓
                 ┌─────────────┐                            ┌──────────────┐
                 │  Raydium    │                            │   Meteora    │
                 │    Quote    │                            │    Quote     │
                 └─────────────┘                            └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dex-trading-engine

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and Redis credentials

# Initialize database
# Make sure PostgreSQL is running, then the app will auto-create tables
```

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Docker Compose (Recommended)

```bash
# Start all services (app, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 📡 API Usage

### Submit an Order

**Endpoint**: `POST /api/orders/execute` (upgrades to WebSocket)

**Request**:
```json
{
  "type": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 1,
  "slippage": 0.01
}
```

**WebSocket Status Updates**:
```json
// Status: pending
{
  "orderId": "ord_abc123...",
  "status": "pending",
  "timestamp": "2024-01-10T00:00:00.000Z"
}

// Status: routing
{
  "orderId": "ord_abc123...",
  "status": "routing",
  "data": {
    "quotes": [
      {
        "dex": "raydium",
        "price": 100.45,
        "amountOut": 97.34,
        "fee": 0.003
      },
      {
        "dex": "meteora",
        "price": 100.52,
        "amountOut": 97.52,
        "fee": 0.002
      }
    ],
    "selectedDex": "meteora"
  },
  "timestamp": "2024-01-10T00:00:00.200Z"
}

// Status: building -> submitted -> confirmed
{
  "orderId": "ord_abc123...",
  "status": "confirmed",
  "data": {
    "selectedDex": "meteora",
    "executedPrice": 100.48,
    "txHash": "5Kq7..."
  },
  "timestamp": "2024-01-10T00:00:02.500Z"
}
```

### Get Queue Metrics

**Endpoint**: `GET /api/orders/metrics`

**Response**:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 10,
    "completed": 1243,
    "failed": 12,
    "total": 1270
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- ✅ DEX Router: Quote generation, routing logic, swap execution
- ✅ Queue Behavior: Concurrency, rate limiting, retry logic  
- ✅ WebSocket Lifecycle: Connection, status streaming, disconnect
- ✅ Helper Functions: ID generation, price formatting, backoff calculation
- ✅ Event System: Emitter, listeners, cleanup

### Example Client Scripts

```bash
# Interactive WebSocket client
node examples/websocket-client.js

# Submit 5 concurrent orders
node examples/test-concurrent-orders.js
```

## 🐳 Deployment

### Docker

```bash
# Build image
docker build -t dex-order-engine .

# Run container
docker run -p 3000:3000 --env-file .env dex-order-engine
```

### Free Hosting Options

- **Render.com**: Deploy PostgreSQL, Redis, and app
- **Railway.app**: One-click deployment with databases
- **Fly.io**: Global edge deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## 📊 Performance

- **Concurrent Processing**: 10 orders simultaneously
- **Throughput**: 100 orders per minute
- **Average Execution Time**: 2-3 seconds per order
- **Retry Strategy**: Exponential backoff, max 3 attempts

## 🔧 Configuration

Key environment variables:

```env
# Queue Configuration
QUEUE_CONCURRENCY=10          # Concurrent orders
QUEUE_MAX_RATE=100            # Max orders per duration
QUEUE_MAX_RATE_DURATION=60000 # Duration in ms

# Order Processing
MAX_RETRIES=3                 # Max retry attempts
SLIPPAGE_TOLERANCE=0.01       # 1% slippage

# DEX Configuration
MOCK_MODE=true                # Use mock DEX implementation
RAYDIUM_BASE_FEE=0.003        # 0.3% fee
METEORA_BASE_FEE=0.002        # 0.2% fee
```

## 📝 Project Structure

```
dex-trading-engine/
├── src/
│   ├── config/          # Database & Redis configuration
│   ├── database/        # Order repository
│   ├── models/          # TypeScript types & interfaces
│   ├── routes/          # API endpoints
│   ├── services/        # DEX router, queue, worker
│   ├── utils/           # Helpers, logger, events
│   └── server.ts        # Main application entry
├── tests/               # Unit & integration tests
├── examples/            # Example client scripts
├── postman/             # Postman API collection
├── docs/                # Additional documentation
└── docker-compose.yml   # Docker services definition
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 📧 Contact

For questions or support, please open an issue or contact [your-email@example.com]

---

**Built with** ❤️ **using Node.js, TypeScript, Fastify, BullMQ, PostgreSQL, and Redis**

