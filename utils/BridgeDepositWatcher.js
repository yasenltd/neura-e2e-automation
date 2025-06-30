import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';
import {BigNumber, ethers} from 'ethers';
import ethBscBridgeAbi from '../abi/EthBscBridge.json' with {type: 'json'};
import neuraBridgeAbi from '../abi/NeuraBridge.json' with {type: 'json'};
import {formatBalanceString} from './util';
import {getBalance, getProvider, getTokenBalance, parseEther, parseToEth} from './ethersUtil';
import {expect} from "@playwright/test";
import {TRANSACTION_APPROVAL_TIMEOUT} from "../constants/timeoutConstants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const erc20Abi = [
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

    async getEthBalance(decimals = 2) {
        const raw       = await getBalance(this.MY_ADDRESS, process.env.SEPOLIA_RPC_URL);
        const tokenStr  = ethers.utils.formatEther(raw);
        console.log(`💰 Raw ETH string: ${tokenStr}`);

        const readable  = formatBalanceString(tokenStr, 'ETH on Sepolia', decimals);
        console.log(`💰 ETH on Sepolia: ${readable}`);

        return readable;
    }

    async getAnkrBalanceOnNeura() {
        const raw = await getBalance(this.MY_ADDRESS, process.env.NEURA_TESTNET_RPC_URL);
        const tokenStr = ethers.utils.formatEther(raw);
        console.log(`💰 Raw ANKR string on Neura: ${tokenStr}`);
        const readable = formatBalanceString(tokenStr, 'ETH on Sepolia');
        console.log(`💰 ANKR on Neura: ${readable}`);
        return readable;
    }

    async estimateDepositGas(amount, recipient = this.MY_ADDRESS) {
        const decimals = 18;
        const parsed = parseToEth(amount, decimals);
        const bridge = this.ethBscBridge.connect(this.signer);
        const gasEstimate = await bridge.estimateGas.deposit(parsed, recipient, {from: this.MY_ADDRESS});
        expect(gasEstimate.gt(0)).toBeTruthy();
    }

    /* ─────────────────────── Tracking helpers ───────────────────── */

    getMessage(messageHash) {
        return this.neuraBridge.messages(messageHash);
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
    async depositAnkr(
        amount,
        recipient = this.MY_ADDRESS,
        { approveOnly = false } = {}
    ) {
        const ankrToken = new ethers.Contract(
            process.env.ANKR_TOKEN_ADDRESS,
            erc20Abi,
            this.signer
        );
        const decimals = await ankrToken.decimals();
        const parsed   = parseToEth(amount, decimals);

        const bridgeAddr = this.ethBscBridge.address;
        const allowance  = await ankrToken.allowance(this.MY_ADDRESS, bridgeAddr);
        if (allowance.lt(parsed)) {
            console.log(`🔑 Approving ${ethers.utils.formatUnits(parsed, decimals)} ANKR …`);
            const txApprove = await ankrToken.approve(bridgeAddr, parsed);
            await txApprove.wait();
        }
        if (approveOnly) return { approved: true };

        // Estimate gas with buffer, or fallback
        const bridge = this.ethBscBridge.connect(this.signer);
        let gasLimitWithBuffer;
        try {
            const estimated = await bridge.estimateGas.deposit(parsed, recipient);
            gasLimitWithBuffer = estimated.mul(120).div(100);            // +20%
            console.log(`✅ estimateGas OK, using gasLimit=${gasLimit.toString()}`);
        } catch (err) {
            console.warn(
                `⚠️ estimateGas failed (${err.code || err.reason}), ` +
                `falling back to 300_000 gasLimit`
            );
            gasLimitWithBuffer = BigNumber.from(300_000);
        }

        // Send deposit txn with explicit gasLimit
        console.log(
            `🚀 Depositing ${ethers.utils.formatUnits(parsed, decimals)} ANKR ` +
            `to ${recipient} with gasLimit ${gasLimitWithBuffer.toString()} …`
        );
        const tx = await bridge.deposit(parsed, recipient, { gasLimit: gasLimitWithBuffer });
        console.log(`⏳ Tx hash: ${tx.hash}`);
        return tx.wait();
    }

    /**
     * Returns the current ANKR allowance you’ve given to the bridge.
     *
     * @param {string} [spender=this.ethBscBridge.address]
     * @returns {Promise<ethers.BigNumber>}
     */
    async getAnkrAllowance(spender = this.ethBscBridge.address) {
        const ankrToken = new ethers.Contract(
            process.env.ANKR_TOKEN_ADDRESS,
            erc20Abi,
            this.provider   // read‐only
        );
        return await ankrToken.allowance(this.MY_ADDRESS, spender);
    }

    /**
     * If you already have a nonzero allowance, clear it by approving 0.
     * Helps force the “approve” flow in your UI tests.
     *
     * @param {string} [spender=this.ethBscBridge.address]
     * @returns {Promise<ethers.providers.TransactionReceipt|null>}
     */
    async clearAnkrAllowance(spender = this.ethBscBridge.address) {
        const ankrToken = new ethers.Contract(
            process.env.ANKR_TOKEN_ADDRESS,
            erc20Abi,
            this.signer     // must be a signer to send tx
        );

        const current = await ankrToken.allowance(this.MY_ADDRESS, spender);
        if (current.gt(0)) {
            console.log(`🔄 Clearing existing ANKR allowance of ${current.toString()} → 0`);
            const tx = await ankrToken.approve(spender, 0);
            return tx.wait();
        } else {
            console.log(`ℹ️ No ANKR allowance to clear (already zero)`);
            return null;
        }
    }

    /** Predict the hash a UI deposit will emit (no state change). */
    async predictNativeDepositHash(amount, destChainId, recipient = this.MY_ADDRESS) {
        const value = parseEther(amount.toString());
        const bridge = this.neuraBridge.connect(this.neuraSigner);
        let messageHash = await bridge.callStatic.deposit(recipient, destChainId, { value });
        console.log('📬 messageHash:', messageHash);
        return messageHash;
    }

    /**
     * Deposit ANKR on NEURA via the Neura bridge (payable) and return messageHash.
     */
    async depositNativeOnNeura(
        amount,
        destChainId,
        recipient = this.MY_ADDRESS
    ) {
        if (destChainId === undefined || destChainId === null) {
            throw new Error('destChainId is required');
        }

        const value  = parseEther(amount.toString());
        const bridge = this.neuraBridge.connect(this.neuraSigner);

        const messageHash = await bridge.callStatic.deposit(recipient, destChainId, { value });

        console.log(
            `🚀 Depositing ${ethers.utils.formatEther(value)} native token(s)` +
            ` to chain ${destChainId} for ${recipient}…`
        );

        let gasLimitWithBuffer;
        try {
            const estimated = await bridge.estimateGas.deposit(recipient, destChainId, { value });
            gasLimitWithBuffer = estimated.mul(120).div(100);
            console.log(`✅ estimateGas OK, using gasLimit=${gasLimitWithBuffer.toString()}`);
        } catch (err) {
            console.warn(
                `⚠️ estimateGas failed (${err.code || err.reason || err.message}), ` +
                `falling back to gasLimit=300_000`
            );
            gasLimitWithBuffer = BigNumber.from(300_000);
        }

        const tx = await bridge.deposit(recipient, destChainId, { value, gasLimit: gasLimitWithBuffer });
        console.log(`⏳ Tx hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
        console.log(`📬 messageHash: ${messageHash}`);
        return { tx, receipt, messageHash };
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
            console.log('Latest block:', latest);
            const startBlock = fromBlock ?? Math.max(latest - 30, 0);

            const past = await this.neuraProvider.getLogs({
                ...filter,
                fromBlock: startBlock,
                toBlock: 'latest',
            });

            if (past.length) {
                const rc = await this.neuraProvider.getTransactionReceipt(past[0].transactionHash);
                console.log(`✅ BridgeTransferApproved event found in past logs: ${past[0].transactionHash}`);
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
                console.log(`✅ BridgeTransferApproved event detected: ${log.transactionHash}`);
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
    async waitForNextDeposit(blockStart, timeoutMs = 30_000) {
        const result = await new Promise((resolve, reject) => {
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

        console.log(`✅ TokensDeposited event found: ${result.txHash}`);
        console.log('Waiting for transaction approval…');
        await new Promise(r => setTimeout(r, TRANSACTION_APPROVAL_TIMEOUT));
        return result;
    }
}

export default BridgeDepositWatcher;
