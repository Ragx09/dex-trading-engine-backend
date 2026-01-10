import { nanoid } from 'nanoid';

/**
 * Generate a unique order ID
 */
export function generateOrderId(): string {
    return `ord_${nanoid(16)}`;
}

/**
 * Generate a mock transaction hash
 */
export function generateMockTxHash(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function getExponentialBackoff(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

/**
 * Format price to 6 decimal places
 */
export function formatPrice(price: number): number {
    return Math.round(price * 1000000) / 1000000;
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(inputAmount: number, outputAmount: number, spotPrice: number): number {
    const executionPrice = inputAmount / outputAmount;
    const impact = ((executionPrice - spotPrice) / spotPrice) * 100;
    return Math.abs(impact);
}
