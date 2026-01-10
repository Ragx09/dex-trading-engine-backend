import { generateOrderId, generateMockTxHash, sleep, getExponentialBackoff, formatPrice, calculatePriceImpact } from '../src/utils/helpers';

describe('Helper Functions', () => {
    describe('generateOrderId', () => {
        it('should generate a unique order ID with correct format', () => {
            const id1 = generateOrderId();
            const id2 = generateOrderId();

            expect(id1).toMatch(/^ord_[A-Za-z0-9_-]{16}$/);
            expect(id2).toMatch(/^ord_[A-Za-z0-9_-]{16}$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateMockTxHash', () => {
        it('should generate a 64-character transaction hash', () => {
            const hash = generateMockTxHash();

            expect(hash).toHaveLength(64);
            expect(hash).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/); // Base58 characters
        });

        it('should generate unique hashes', () => {
            const hash1 = generateMockTxHash();
            const hash2 = generateMockTxHash();

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('sleep', () => {
        it('should pause execution for the specified duration', async () => {
            const start = Date.now();
            await sleep(100);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(95);
            expect(duration).toBeLessThan(150);
        });
    });

    describe('getExponentialBackoff', () => {
        it('should calculate exponential backoff correctly', () => {
            expect(getExponentialBackoff(0, 1000)).toBe(1000);
            expect(getExponentialBackoff(1, 1000)).toBe(2000);
            expect(getExponentialBackoff(2, 1000)).toBe(4000);
            expect(getExponentialBackoff(3, 1000)).toBe(8000);
        });

        it('should cap at 30 seconds', () => {
            const result = getExponentialBackoff(10, 1000);
            expect(result).toBeLessThanOrEqual(30000);
        });
    });

    describe('formatPrice', () => {
        it('should format price to 6 decimal places', () => {
            expect(formatPrice(100.123456789)).toBe(100.123457);
            expect(formatPrice(0.123456789)).toBe(0.123457);
            expect(formatPrice(1)).toBe(1);
        });
    });

    describe('calculatePriceImpact', () => {
        it('should calculate price impact percentage', () => {
            const impact = calculatePriceImpact(100, 95, 1);
            expect(impact).toBeCloseTo(5.26, 1);
        });

        it('should return absolute value', () => {
            const impact1 = calculatePriceImpact(100, 105, 1);
            const impact2 = calculatePriceImpact(100, 95, 1);

            expect(impact1).toBeGreaterThan(0);
            expect(impact2).toBeGreaterThan(0);
        });
    });
});
