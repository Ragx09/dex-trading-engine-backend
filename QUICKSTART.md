# 🚀 Quick Start Guide

Get the DEX Order Execution Engine up and running in under 5 minutes!

## Option 1: Docker Compose (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- No other services running on ports 3000, 5432, 6379

### Steps

```bash
# 1. Clone and navigate to the project
cd dex-trading-engine

# 2. Start all services (PostgreSQL, Redis, App)
docker-compose up -d

# 3. Check logs to ensure everything started
docker-compose logs -f app

# 4. Test the API
curl http://localhost:3000/api/health

# 5. Test with the example client
node examples/test-concurrent-orders.js
```

That's it! The application is running at `http://localhost:3000`

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Option 2: Manual Setup

### Prerequisites
- Node.js >= 18.x
- PostgreSQL >= 14.x running on port 5432
- Redis >= 6.x running on port 6379

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Configure .env file
# Edit DB_HOST, DB_USER, DB_PASSWORD, etc.
nano .env

# 4. Make sure PostgreSQL and Redis are running
# PostgreSQL: createdb dex_orders
# Redis: redis-cli ping

# 5. Start the development server
npm run dev
```

The server will start on `http://localhost:3000`

## Testing the API

### Using Postman

1. Import the collection: `postman/DEX-Order-Engine.postman_collection.json`
2. Run the "Health Check" request to verify the server is running
3. Try "Execute Market Order - SOL to USDC"

### Using WebSocket Client

```bash
# Interactive client
node examples/websocket-client.js

# Follow the prompts to submit an order
```

### Using cURL + wscat

```bash
# Install wscat if you don't have it
npm install -g wscat

# Connect to WebSocket endpoint
wscat -c ws://localhost:3000/api/orders/execute
```

Then send the order as JSON:
```json
{"type":"market","tokenIn":"SOL","tokenOut":"USDC","amountIn":1,"slippage":0.01}
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Viewing Logs

### Docker
```bash
# View app logs
docker-compose logs -f app

# View all service logs
docker-compose logs -f
```

### Manual Setup
Logs will appear in your terminal running `npm run dev`

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change PORT in .env
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -d dex_orders

# Verify credentials in .env match your PostgreSQL setup
```

### Redis Connection Failed

```bash
# Verify Redis is running
redis-cli ping

# Should return: PONG
```

## Next Steps

- 📖 Read the [README.md](../README.md) for full documentation
- 🧪 Explore the [test suite](../tests/)
- 🛠️ Customize configuration in `.env`
- 📮 Try all Postman requests
- 🎥 Record your demo video!

## Need Help?

- Check the full [README](../README.md)
- Review [API documentation](./API.md)
- Open an issue on GitHub
