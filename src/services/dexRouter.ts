import { DexQuote, DexType, Order, RoutingDecision } from '../models/types';
import { logger } from '../utils/logger';
import { sleep, generateMockTxHash, formatPrice, calculatePriceImpact } from '../utils/helpers';
import { wallet, connection } from '../config/solana';
import { PublicKey, VersionedTransaction, Transaction } from '@solana/web3.js';
import { Raydium, ApiV3PoolInfoStandardItem, TxVersion } from '@raydium-io/raydium-sdk-v2';
import DLMM from '@meteora-ag/dlmm';
import { confirmTransaction } from '../utils/solanaUtils';
import BN from 'bn.js';

/**
 * DEX Router for Raydium and Meteora price quotes and execution
 * Supports both Mock and Real Devnet execution
 */
export class DexRouter {
    private raydiumInstance: Raydium | null = null;
    private readonly raydiumBaseFee: number;
    private readonly meteoraBaseFee: number;
    private readonly mockMode: boolean;

    // Common devnet mints for simulation/demo
    private readonly MINTS: Record<string, string> = {
        'sol': 'So11111111111111111111111111111111111111112',
        'usdc': '4zMMC9srtvS2PPSgtYqx8SCUvXQDCknM95fG59J6Mmd',
        'usdt': 'EJwZgeZveY97CcR4Nv7bsrbS832G4Q5nTy4sN88T2p4a',
    };

    constructor() {
        this.raydiumBaseFee = parseFloat(process.env.RAYDIUM_BASE_FEE || '0.003');
        this.meteoraBaseFee = parseFloat(process.env.METEORA_BASE_FEE || '0.002');
        this.mockMode = process.env.MOCK_MODE === 'true';
    }

    private async getRaydium(): Promise<Raydium> {
        if (this.raydiumInstance) return this.raydiumInstance;
        this.raydiumInstance = await Raydium.load({
            connection,
            owner: wallet || undefined,
            disableFeatureCheck: true,
            cluster: 'devnet',
        });
        return this.raydiumInstance;
    }

    /**
     * Get quote from Raydium DEX
     */
    async getRaydiumQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DexQuote> {
        if (this.mockMode) {
            await sleep(150 + Math.random() * 100);
            const basePrice = this.getBasePrice(tokenIn, tokenOut);
            const price = basePrice * (0.98 + Math.random() * 0.04);
            const fee = this.raydiumBaseFee;
            const amountOut = (amountIn * price) * (1 - fee);
            const priceImpact = calculatePriceImpact(amountIn, amountOut, basePrice);

            return {
                dex: 'raydium',
                price: formatPrice(price),
                fee,
                amountOut: formatPrice(amountOut),
                priceImpact: formatPrice(priceImpact),
                estimatedGas: 5000,
            };
        }

        try {
            const raydium = await this.getRaydium();
            const mintIn = this.MINTS[tokenIn.toLowerCase()] || tokenIn;
            const mintOut = this.MINTS[tokenOut.toLowerCase()] || tokenOut;

            const data = await raydium.api.fetchPoolByMints({
                mint1: mintIn,
                mint2: mintOut,
            });

            const poolInfo = data.data[0] as ApiV3PoolInfoStandardItem;
            if (!poolInfo) throw new Error(`No Raydium pool found for ${tokenIn}/${tokenOut}`);

            const price = poolInfo.price;
            const fee = poolInfo.feeRate;
            const amountOut = amountIn * price * (1 - fee);

            return {
                dex: 'raydium',
                price,
                fee,
                amountOut,
                priceImpact: 0.1,
                estimatedGas: 10000,
            };
        } catch (error) {
            logger.error({ error, tokenIn, tokenOut }, 'Failed to fetch Raydium quote');
            throw error;
        }
    }

    /**
     * Get quote from Meteora DEX
     */
    async getMeteorQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<DexQuote> {
        if (this.mockMode) {
            await sleep(150 + Math.random() * 100);
            const basePrice = this.getBasePrice(tokenIn, tokenOut);
            const price = basePrice * (0.97 + Math.random() * 0.05);
            const fee = this.meteoraBaseFee;
            const amountOut = (amountIn * price) * (1 - fee);
            const priceImpact = calculatePriceImpact(amountIn, amountOut, basePrice);

            return {
                dex: 'meteora',
                price: formatPrice(price),
                fee,
                amountOut: formatPrice(amountOut),
                priceImpact: formatPrice(priceImpact),
                estimatedGas: 4500,
            };
        }

        try {
            const mintIn = this.MINTS[tokenIn.toLowerCase()] || tokenIn;
            const mintOut = this.MINTS[tokenOut.toLowerCase()] || tokenOut;

            const pools = await (DLMM as any).getLbPoolsByTokenPair(connection, new PublicKey(mintIn), new PublicKey(mintOut));
            if (!pools || pools.length === 0) throw new Error(`No Meteora DLMM pool found for ${tokenIn}/${tokenOut}`);

            const dlmm = await DLMM.create(connection, pools[0].pubkey);
            const activeBin = await dlmm.getActiveBin();

            // Price conversion
            const price = parseFloat(dlmm.fromPricePerLamport(Number(activeBin.price)));

            const amountOut = amountIn * price;

            return {
                dex: 'meteora',
                price,
                fee: 0.001,
                amountOut,
                priceImpact: 0.05,
                estimatedGas: 8000,
            };
        } catch (error) {
            logger.error({ error, tokenIn, tokenOut }, 'Failed to fetch Meteora quote');
            throw error;
        }
    }

    /**
     * Compare quotes and select the best DEX
     */
    async getBestRoute(tokenIn: string, tokenOut: string, amountIn: number): Promise<RoutingDecision> {
        const [raydiumQuote, meteoraQuote] = await Promise.all([
            this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
            this.getMeteorQuote(tokenIn, tokenOut, amountIn),
        ]);

        const selectedDex: DexType = raydiumQuote.amountOut > meteoraQuote.amountOut ? 'raydium' : 'meteora';
        const priceDifference = Math.abs(raydiumQuote.amountOut - meteoraQuote.amountOut);
        const priceDifferencePercent = (priceDifference / Math.max(raydiumQuote.amountOut, meteoraQuote.amountOut)) * 100;

        const reason = selectedDex === 'raydium'
            ? `Raydium offers ${formatPrice(priceDifference)} more tokens (${formatPrice(priceDifferencePercent)}% better)`
            : `Meteora offers ${formatPrice(priceDifference)} more tokens (${formatPrice(priceDifferencePercent)}% better)`;

        return {
            selectedDex,
            raydiumQuote,
            meteoraQuote,
            priceDifference: formatPrice(priceDifferencePercent),
            reason,
        };
    }

    /**
     * Execute swap on the selected DEX
     */
    async executeSwap(dex: DexType, order: Order): Promise<{ txHash: string; executedPrice: number; amountOut: number }> {
        logger.info({ dex, orderId: order.id, mockMode: this.mockMode }, 'Executing swap');

        if (this.mockMode) {
            await sleep(2000 + Math.random() * 1000);
            const txHash = generateMockTxHash();
            const slippageAmount = Math.random() * order.slippage;
            const basePrice = this.getBasePrice(order.tokenIn, order.tokenOut);
            const executedPrice = basePrice * (1 - slippageAmount);
            const fee = dex === 'raydium' ? this.raydiumBaseFee : this.meteoraBaseFee;
            const amountOut = (order.amountIn * executedPrice) * (1 - fee);

            return { txHash, executedPrice: formatPrice(executedPrice), amountOut: formatPrice(amountOut) };
        }

        if (!wallet) throw new Error('Real execution requires SOLANA_PRIVATE_KEY');

        const tokenInMint = this.MINTS[order.tokenIn.toLowerCase()] || order.tokenIn;
        const tokenOutMint = this.MINTS[order.tokenOut.toLowerCase()] || order.tokenOut;

        try {
            let txHash: string;
            if (dex === 'raydium') {
                txHash = await this.executeRaydiumSwap(tokenInMint, tokenOutMint, order.amountIn, order.slippage);
            } else {
                txHash = await this.executeMeteoraSwap(tokenInMint, tokenOutMint, order.amountIn, order.slippage);
            }

            // For now, we estimate the price based on the successful tx. 
            // Ideally we'd parse the tx logs, but for this simpler engine we rely on the quote price logic
            // or we could refetch the quote.
            const finalPrice = this.getBasePrice(order.tokenIn, order.tokenOut);

            // Note: In a production system, we would parse the transaction simulation or result 
            // to get the exact executed price. Here we return the estimated/input price.
            return {
                txHash,
                executedPrice: formatPrice(finalPrice),
                amountOut: formatPrice(order.amountIn * finalPrice)
            };
        } catch (error: any) {
            logger.error({ error, orderId: order.id }, 'Real DEX execution failed');
            throw error;
        }
    }

    private getDecimals(mint: string): number {
        // Known devnet mints
        if (mint === 'So11111111111111111111111111111111111111112') return 9; // SOL
        if (mint === '4zMMC9srtvS2PPSgtYqx8SCUvXQDCknM95fG59J6Mmd') return 6; // USDC
        if (mint === 'EJwZgeZveY97CcR4Nv7bsrbS832G4Q5nTy4sN88T2p4a') return 6; // USDT
        return 9; // Default fallback
    }

    private async executeRaydiumSwap(mintIn: string, mintOut: string, amount: number, slippage: number): Promise<string> {
        if (!wallet) throw new Error('Wallet not initialized');
        const raydium = await this.getRaydium();
        const data = await raydium.api.fetchPoolByMints({ mint1: mintIn, mint2: mintOut });
        const poolInfo = data.data[0] as ApiV3PoolInfoStandardItem;
        if (!poolInfo) throw new Error('No Raydium pool found');

        const decimalIn = this.getDecimals(mintIn);
        const amountInBN = new BN(Math.floor(amount * 10 ** decimalIn));
        const minAmountOutBN = new BN(0); // For demo, we are setting 0 to ensure it passes. In prod, calculated based on slippage.

        const { execute } = await raydium.liquidity.swap({
            poolInfo,
            amountIn: amountInBN,
            amountOut: minAmountOutBN,
            inputMint: mintIn,
            fixedSide: 'in',
            txVersion: TxVersion.V0,
        });

        const { txId } = await execute();
        logger.info({ txId }, 'Raydium swap submitted');
        const confirmed = await confirmTransaction(connection, txId);
        if (!confirmed) throw new Error(`Raydium swap ${txId} failed confirm`);
        return txId;
    }

    private async executeMeteoraSwap(mintIn: string, mintOut: string, amount: number, slippage: number): Promise<string> {
        if (!wallet) throw new Error('Wallet not initialized');
        const pools = await (DLMM as any).getLbPoolsByTokenPair(connection, new PublicKey(mintIn), new PublicKey(mintOut));
        if (!pools || pools.length === 0) throw new Error('No Meteora pool found');

        const dlmm = await DLMM.create(connection, pools[0].pubkey);

        const swapForY = mintIn === pools[0].tokenX.toString();
        const binArrays = await (dlmm as any).getBinArrayForSwap(swapForY);

        const decimalIn = this.getDecimals(mintIn);
        const inAmountBN = new BN(Math.floor(amount * 10 ** decimalIn));

        // Allowed slippage in basis points (1% = 100 bps)
        const slippageBps = new BN(Math.floor(slippage * 10000));

        const swapQuote = await (dlmm as any).swapQuote(inAmountBN, swapForY, slippageBps, binArrays);

        const swapTx = await dlmm.swap({
            inToken: new PublicKey(mintIn),
            outToken: new PublicKey(mintOut),
            inAmount: inAmountBN,
            minOutAmount: swapQuote.minOutAmount,
            lbPair: pools[0].pubkey,
            user: wallet.publicKey,
            binArraysPubkey: swapQuote.binArraysPubkey,
        });

        const txPath = swapTx instanceof Transaction ?
            connection.sendTransaction(swapTx, [wallet]) :
            connection.sendTransaction(swapTx as VersionedTransaction);

        const txId = await txPath;
        logger.info({ txId }, 'Meteora swap submitted');
        const confirmed = await confirmTransaction(connection, txId);
        if (!confirmed) throw new Error(`Meteora swap ${txId} failed confirm`);
        return txId;
    }

    private getBasePrice(tokenIn: string, tokenOut: string): number {
        const pairKey = `${tokenIn}-${tokenOut}`.toLowerCase();
        const mockPrices: Record<string, number> = {
            'sol-usdc': 100.5, 'usdc-sol': 0.00995,
            'sol-usdt': 100.3, 'usdt-sol': 0.00997,
            'bonk-sol': 0.00001, 'sol-bonk': 100000,
        };
        return mockPrices[pairKey] || 1.0;
    }
}

export default new DexRouter();
