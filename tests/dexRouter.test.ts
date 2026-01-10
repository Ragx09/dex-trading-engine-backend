import dexRouter from '../src/services/dexRouter';
import { sleep } from '../src/utils/helpers';

describe('DEX Router', () => {
    describe('getRaydiumQuote', () => {
        it('should return a valid quote from Raydium', async () => {
            const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 1);

            expect(quote).toBeDefined();
            expect(quote.dex).toBe('raydium');
            expect(quote.price).toBeGreaterThan(0);
            expect(quote.fee).toBe(0.003);
            expect(quote.amountOut).toBeGreaterThan(0);
            expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
            expect(quote.estimatedGas).toBeGreaterThan(0);
        });

        it('should have realistic network delay', async () => {
            const start = Date.now();
            await dexRouter.getRaydiumQuote('SOL', 'USDC', 1);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(150);
            expect(duration).toBeLessThan(500);
        });
    });

    describe('getMeteorQuote', () => {
        it('should return a valid quote from Meteora', async () => {
            const quote = await dexRouter.getMeteorQuote('SOL', 'USDC', 1);

            expect(quote).toBeDefined();
            expect(quote.dex).toBe('meteora');
            expect(quote.price).toBeGreaterThan(0);
            expect(quote.fee).toBe(0.002);
            expect(quote.amountOut).toBeGreaterThan(0);
            expect(quote.priceImpact).toBeGreaterThanOrEqual(0);
            expect(quote.estimatedGas).toBeGreaterThan(0);
        });
    });

    describe('getBestRoute', () => {
        it('should compare both DEXs and return a routing decision', async () => {
            const decision = await dexRouter.getBestRoute('SOL', 'USDC', 1);

            expect(decision).toBeDefined();
            expect(decision.selectedDex).toMatch(/^(raydium|meteora)$/);
            expect(decision.raydiumQuote).toBeDefined();
            expect(decision.meteoraQuote).toBeDefined();
            expect(decision.priceDifference).toBeGreaterThanOrEqual(0);
            expect(decision.reason).toBeDefined();
        });

        it('should select the DEX with better output amount', async () => {
            const decision = await dexRouter.getBestRoute('SOL', 'USDC', 10);

            const selectedQuote =
                decision.selectedDex === 'raydium'
                    ? decision.raydiumQuote
                    : decision.meteoraQuote;
            const otherQuote =
                decision.selectedDex === 'raydium'
                    ? decision.meteoraQuote
                    : decision.raydiumQuote;

            expect(selectedQuote.amountOut).toBeGreaterThanOrEqual(otherQuote.amountOut);
        });

        it('should execute both quotes concurrently', async () => {
            const start = Date.now();
            await dexRouter.getBestRoute('SOL', 'USDC', 1);
            const duration = Date.now() - start;

            // Should take around 200ms (not 400ms if sequential)
            expect(duration).toBeLessThan(400);
        });
    });

    describe('executeSwap', () => {
        it('should execute a swap successfully', async () => {
            const mockOrder = {
                id: 'test-order-1',
                type: 'market' as const,
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amountIn: 1,
                slippage: 0.01,
                status: 'building' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await dexRouter.executeSwap('raydium', mockOrder);

            expect(result).toBeDefined();
            expect(result.txHash).toBeDefined();
            expect(result.txHash.length).toBe(64);
            expect(result.executedPrice).toBeGreaterThan(0);
            expect(result.amountOut).toBeGreaterThan(0);
        });

        it('should take 2-3 seconds to execute', async () => {
            const mockOrder = {
                id: 'test-order-2',
                type: 'market' as const,
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amountIn: 1,
                slippage: 0.01,
                status: 'building' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const start = Date.now();
            await dexRouter.executeSwap('meteora', mockOrder);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(2000);
            expect(duration).toBeLessThan(3500);
        });

        it('should respect slippage settings', async () => {
            const mockOrder = {
                id: 'test-order-3',
                type: 'market' as const,
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amountIn: 100,
                slippage: 0.05,
                status: 'building' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await dexRouter.executeSwap('raydium', mockOrder);

            // The executed price should be within slippage tolerance
            const basePrice = 100.5; // Known base price for SOL-USDC
            const priceDifference = Math.abs(result.executedPrice - basePrice) / basePrice;

            expect(priceDifference).toBeLessThanOrEqual(mockOrder.slippage);
        });
    });
});
