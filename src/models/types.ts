// Order Types
export type OrderType = 'market' | 'limit' | 'sniper';
export type OrderStatus = 'pending' | 'routing' | 'building' | 'submitted' | 'confirmed' | 'failed';
export type DexType = 'raydium' | 'meteora';

// Order Interface
export interface Order {
    id: string;
    type: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage: number;
    status: OrderStatus;
    selectedDex?: DexType;
    executedPrice?: number;
    targetPrice?: number; // For Limit orders
    activationDate?: Date; // For Sniper orders
    txHash?: string;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Order Request (from API)
export interface OrderRequest {
    type: OrderType;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    slippage?: number;
    targetPrice?: number;
    activationDate?: Date;
}

// DEX Quote
export interface DexQuote {
    dex: DexType;
    price: number;
    fee: number;
    amountOut: number;
    priceImpact: number;
    estimatedGas: number;
}

// Execution Result
export interface ExecutionResult {
    orderId: string;
    txHash: string;
    executedPrice: number;
    amountOut: number;
    fee: number;
    dex: DexType;
}

// WebSocket Message
export interface WebSocketMessage {
    orderId: string;
    status: OrderStatus;
    data?: {
        selectedDex?: DexType;
        executedPrice?: number;
        txHash?: string;
        error?: string;
        quotes?: DexQuote[];
    };
    timestamp: Date;
}

// Queue Job Data
export interface OrderJobData {
    orderId: string;
    order: Order;
}

// Routing Decision
export interface RoutingDecision {
    selectedDex: DexType;
    raydiumQuote: DexQuote;
    meteoraQuote: DexQuote;
    priceDifference: number;
    reason: string;
}
