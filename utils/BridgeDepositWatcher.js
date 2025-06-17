const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ethers } = require('ethers');
const ethBscBridgeAbi = require('../abi/EthBscBridge.json');
const neuraBridgeAbi = require('../abi/NeuraBridge.json');
const {
    getProvider,
    getBalance,
    getTokenBalance,
} = require('../utils/ethersUtil');

const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
];

class BridgeDepositWatcher {
    constructor() {
        const addr = process.env.MY_ADDRESS?.toLowerCase();
        if (!addr) throw new Error('❌ MY_ADDRESS is required');
        if (!process.env.PRIVATE_KEY) throw new Error('❌ PRIVATE_KEY is required');

        this.MY_ADDRESS = addr;

        this.provider = getProvider(process.env.SEPOLIA_RPC_URL);
        this.neuraProvider = getProvider(process.env.NEURA_TESTNET_RPC_URL);

        this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.neuraSigner = new ethers.Wallet(process.env.PRIVATE_KEY, this.neuraProvider);

        this.ethBscBridge = new ethers.Contract(
            process.env.SEPOLIA_BRIDGE_PROXY_ADDRESS,
            ethBscBridgeAbi,
            this.provider,
        );

        this.neuraBridge = new ethers.Contract(
            process.env.NEURA_BRIDGE_PROXY_ADDRESS,
            neuraBridgeAbi,
            this.neuraProvider,
        );

        this.filter = this.ethBscBridge.filters.TokensDeposited(addr);
    }

    /* ───────────────────────── Balance helpers ──────────────────── */

    async getAnkrBalance() {
        const raw = await getTokenBalance(
            this.MY_ADDRESS,
            process.env.ANKR_TOKEN_ADDRESS,
            process.env.SEPOLIA_RPC_URL,
        );
        const readable = ethers.utils.formatUnits(raw);
        console.log(`🪙 ANKR on Sepolia: ${readable}`);
        return readable;
    }

    async getEthBalance() {
        const raw = await getBalance(this.MY_ADDRESS, process.env.SEPOLIA_RPC_URL);
        const readable = ethers.utils.formatEther(raw);
        console.log(`💰 ETH on Sepolia: ${readable}`);
        return readable;
    }

    async getAnkrBalanceOnNeura() {
        const raw = await getBalance(this.MY_ADDRESS, process.env.NEURA_TESTNET_RPC_URL);
        const readable = ethers.utils.formatEther(raw);
        console.log(`💰 ANKR on Neura: ${readable}`);
        return readable;
    }

    async estimateDepositGas(amount, recipient = this.MY_ADDRESS) {
        const decimals = 18;
        const parsed = ethers.utils.parseUnits(amount, decimals);

        const bridge = this.ethBscBridge.connect(this.signer); // ensures correct `from`
        return bridge.estimateGas.deposit(parsed, recipient, { from: this.MY_ADDRESS });
    }


    /* ─────────────────────── Tracking helpers ───────────────────── */

    getMessage(messageHash) {
        return this.neuraBridge.messages(messageHash);
    }

    async getSignatureCount(messageHash) {
        const signatures = await this.neuraBridge.getSignatures(messageHash);
        return signatures.length;
    }

    async getFreshBlockNumber(prov = this.provider) {
        return parseInt(await prov.send('eth_blockNumber', []));
    }

    /* ────────────────── Bridge helpers ────────────────── */

    /**
     * Approve & (optionally) deposit ERC-20 ANKR from Sepolia → Neura.
     *
     * @param {string} amount
     * @param {string} [recipient=this.MY_ADDRESS]
     * @param {{ approveOnly?: boolean }} [opts]
     *        • approveOnly=true → only set allowance, don’t send deposit
     */
    async depositAnkr(amount, recipient = this.MY_ADDRESS, { approveOnly = false } = {}) {
        // Parse amount
        const ankrToken = new ethers.Contract(process.env.ANKR_TOKEN_ADDRESS, erc20Abi, this.signer);
        const decimals = await ankrToken.decimals();
        const parsed = ethers.utils.parseUnits(amount, decimals);

        // Allowance to be approved
        const bridgeAddr = this.ethBscBridge.address;
        const allowance = await ankrToken.allowance(this.MY_ADDRESS, bridgeAddr);
        if (allowance.lt(parsed)) {
            console.log(`🔑 Approving ${ethers.utils.formatUnits(parsed, decimals)} ANKR …`);
            const txApprove = await ankrToken.approve(bridgeAddr, parsed);
            await txApprove.wait();
        }

        if (approveOnly) return { approved: true };

        // Deposit
        const bridge = this.ethBscBridge.connect(this.signer);
        console.log(`🚀 Depositing ${ethers.utils.formatUnits(parsed, decimals)} ANKR to ${recipient} …`);
        const tx = await bridge.deposit(parsed, recipient);
        console.log(`⏳ Tx hash: ${tx.hash}`);
        return tx.wait();
    }

    /** Predict the hash a UI deposit will emit (no state change). */
    async predictNativeDepositHash(amount, destChainId, recipient = this.MY_ADDRESS) {
        const value = ethers.utils.parseEther(amount.toString());
        const bridge = this.neuraBridge.connect(this.neuraSigner);
        return bridge.callStatic.deposit(recipient, destChainId, { value });
    }

    /**
     * Deposit ANKR on NEURA via the Neura bridge (payable) and return messageHash.
     */
    async depositNativeOnNeura(amount, destChainId, recipient = this.MY_ADDRESS) {
        if (destChainId === undefined || destChainId === null) {
            throw new Error('destChainId is required');
        }

        const value = ethers.utils.parseEther(amount);

        const bridge = this.neuraBridge.connect(this.neuraSigner);
        const predictedHash = await bridge.callStatic.deposit(recipient, destChainId, { value });

        console.log(
            `🚀 Depositing ${ethers.utils.formatEther(value)} native token(s) to chain ${destChainId}`
            + ` for ${recipient}…`,
        );
        const tx = await bridge.deposit(recipient, destChainId, { value });
        console.log(`⏳ Tx hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
        console.log(`📬 messageHash: ${predictedHash}`);

        return { tx, receipt, messageHash: predictedHash };
    }

    /**
     * Claim an approved transfer on **Sepolia** after a Neura deposit.
     *
     * Caller passes only the `messageHash` that was produced during the deposit
     * flow.  The method pulls the packed message + signatures from the Neura
     * bridge, checks that the embedded destination chain-id equals Sepolia
     * (11155111), and then calls `claim` on the Sepolia side.
     *
     * @param {string} messageHash
     * @returns {Promise<ethers.providers.TransactionReceipt>}
     */
    async claimTransfer(messageHash) {
        const [message, signatures] = await Promise.all([
            this.getMessage(messageHash),
            this.neuraBridge.getSignatures(messageHash),
        ]);
        console.log('Validators signatures count:', signatures.length);
        if (!signatures.length) throw new Error('No validator signatures collected yet');

        const sepoliaBridge = this.ethBscBridge.connect(this.signer);
        console.log(`🚚 Claiming on Sepolia via ${sepoliaBridge.address} …`);
        const receipt = await (await sepoliaBridge.claim(message, signatures)).wait();
        console.log(`✅ Claim confirmed in block ${receipt.blockNumber}`);
        return receipt;
    }

    /* ────────────────── Event waiter helpers ────────────────── */

    /**
     * Resolve with the tx-receipt once `BridgeTransferApproved(messageHash)` is
     * observed.  First scans past logs from `fromBlock`, then (if not found)
     * listens for the next occurrence.
     *
     * @param {string}  messageHash                hash returned by the deposit
     * @param {number} [timeoutMs   = 30_000]      max wait time (ms)
     * @param {number} [fromBlock]                 start block for past-log scan
     *                                             – pass your marker for zero-lag
     */
    waitForApproval(messageHash, timeoutMs = 60_000, fromBlock) {
        const filter = this.neuraBridge.filters.BridgeTransferApproved(messageHash);

        return new Promise(async (resolve, reject) => {
            // Past-log scan
            const latest = await this.getFreshBlockNumber(this.neuraProvider);
            const startBlock = fromBlock ?? Math.max(latest - 20, 0);

            const past = await this.neuraProvider.getLogs({
                ...filter,
                fromBlock: startBlock,
                toBlock: 'latest',
            });

            if (past.length) {
                const rc = await this.neuraProvider.getTransactionReceipt(past[0].transactionHash);
                return resolve(rc);
            }

            // Future listener
            const timer = setTimeout(() => {
                this.neuraProvider.off(filter, handler);
                reject(new Error('Timed out waiting for BridgeTransferApproved'));
            }, timeoutMs);

            const handler = (log) => {
                clearTimeout(timer);
                this.neuraProvider.off(filter, handler);
                this.neuraProvider
                    .getTransactionReceipt(log.transactionHash)
                    .then(resolve)
                    .catch(reject);
            };

            this.neuraProvider.on(filter, handler);
        });
    }

    /**
     * Wait for the next TokensDeposited(from = MY_ADDRESS) event that appears
     * *after* a given block number.  Resolves with { txHash, parsedEvent }.
     * @param {number}  blockStart   a marker captured BEFORE the UI click
     * @param {number} [timeoutMs=30_000]
     */
    waitForNextDeposit(blockStart, timeoutMs = 30_000) {
        return new Promise((resolve, reject) => {
            const filter = this.ethBscBridge.filters.TokensDeposited(this.MY_ADDRESS);

            const handler = (...args) => {
                const event = args[args.length - 1];
                const ok =
                    event.blockNumber > blockStart ||
                    (event.blockNumber === blockStart &&
                        event.logIndex > 0);

                if (!ok) return;

                cleanup();
                const parsed = this.ethBscBridge.interface.parseLog(event);
                resolve({ txHash: event.transactionHash, parsed });
            };

            const cleanup = () => {
                clearTimeout(timer);
                this.ethBscBridge.off(filter, handler);
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('Timed out waiting for TokensDeposited'));
            }, timeoutMs);

            this.ethBscBridge.on(filter, handler);
        });
    }
}

module.exports = BridgeDepositWatcher;
