import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { logger } from '../utils/logger';

/**
 * Solana Network Configuration
 */
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const privateKey = process.env.SOLANA_PRIVATE_KEY;

export const connection = new Connection(rpcUrl, 'confirmed');

let wallet: Keypair | null = null;

if (privateKey) {
    try {
        let secretKey: Uint8Array;
        if (privateKey.trim().startsWith('[') && privateKey.trim().endsWith(']')) {
            secretKey = Uint8Array.from(JSON.parse(privateKey));
        } else {
            secretKey = bs58.decode(privateKey);
        }
        wallet = Keypair.fromSecretKey(secretKey);
        logger.info('Solana wallet initialized successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to initialize Solana wallet. Check SOLANA_PRIVATE_KEY format.');
    }
} else {
    logger.warn('SOLANA_PRIVATE_KEY not provided. Real transactions will fail.');
}

export { wallet };
