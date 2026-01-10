import { Connection, Transaction, sendAndConfirmTransaction, Keypair, TransactionSignature, ComputeBudgetProgram } from '@solana/web3.js';
import { logger } from './logger';

/**
 * Confirms a transaction with a timeout and retry logic
 */
export async function confirmTransaction(
    connection: Connection,
    signature: TransactionSignature,
    maxRetries = 3
): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const { value } = await connection.confirmTransaction(signature, 'confirmed');
            if (value.err) {
                logger.error({ signature, error: value.err }, 'Transaction confirmation failed');
                return false;
            }
            return true;
        } catch (error) {
            retries++;
            logger.warn({ signature, attempt: retries, error }, 'Retrying transaction confirmation');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
}

/**
 * Gets a priority fee estimate based on recent performance
 */
export async function getPriorityFee(connection: Connection): Promise<number> {
    try {
        const fees = await connection.getRecentPrioritizationFees();
        if (fees.length === 0) return 1000; // Default 1000 micro-lamports

        // Take the median of recent fees
        const sortedFees = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
        const median = sortedFees[Math.floor(sortedFees.length / 2)];
        return Math.max(median, 1000); // Minimum 1000
    } catch (error) {
        logger.error({ error }, 'Failed to get priority fee, using default');
        return 1000;
    }
}

/**
 * Adds priority fee instructions to a transaction
 */
export function addPriorityFee(transaction: Transaction, microLamports: number): void {
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports,
    });
    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 200000,
    });
    transaction.add(computeLimitIx, priorityFeeIx);
}
