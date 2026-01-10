const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

async function generateWallet() {
    console.log('🔐 Generating new Solana wallet...\n');

    const keypair = Keypair.generate();
    const privateKeyArray = Array.from(keypair.secretKey);
    const publicKey = keypair.publicKey.toBase58();

    // Save wallet file
    const walletPath = path.join(__dirname, '..', 'devnet-wallet.json');
    fs.writeFileSync(walletPath, JSON.stringify(privateKeyArray, null, 2));

    console.log('✅ Wallet generated!');
    console.log('📍 Public Key:', publicKey);
    console.log('📁 Saved to: devnet-wallet.json\n');

    // Update .env
    const envPath = path.join(__dirname, '..', '.env');
    const envLine = `WALLET_PRIVATE_KEY=${JSON.stringify(privateKeyArray)}\nSOLANA_RPC_URL=https://api.devnet.solana.com\n`;

    if (fs.existsSync(envPath)) {
        const existing = fs.readFileSync(envPath, 'utf-8');
        if (!existing.includes('WALLET_PRIVATE_KEY')) {
            fs.appendFileSync(envPath, '\n' + envLine);
            console.log('✅ Added to .env file\n');
        }
    } else {
        fs.writeFileSync(envPath, envLine);
        console.log('✅ Created .env file\n');
    }

    // Request airdrop
    console.log('💰 Requesting 2 SOL airdrop...');
    try {
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
        const sig = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        console.log('✅ Airdrop successful!\n');
    } catch (error) {
        console.log('⚠️  Auto-airdrop failed. Get SOL manually at:');
        console.log('🔗 https://faucet.solana.com\n');
        console.log('Your public key:', publicKey, '\n');
    }

    console.log('⚠️  IMPORTANT: Add to .gitignore:');
    console.log('   - devnet-wallet.json');
    console.log('   - .env\n');
}

generateWallet().catch(console.error);