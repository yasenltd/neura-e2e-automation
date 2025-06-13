const { test, expect } = require('@playwright/test');
const { ethers } = require('ethers');
const BridgeDepositWatcher = require('../utils/BridgeDepositWatcher');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');
const networks = require('../constants/networkConstants');

test.describe('Smart-contract bridge flows (no UI)', () => {
    test('ANKR deposit from Sepolia to Neura', async () => {
        test.setTimeout(TEST_TIMEOUT);

        const watcher = new BridgeDepositWatcher();

        // Approve allowance first (no deposit yet)
        await watcher.depositAnkr(TEST_AMOUNT, undefined, { approveOnly: true });

        // Gas estimation before deposit
        const gasEstimate = await watcher.estimateDepositGas(TEST_AMOUNT);
        expect(gasEstimate.gt(0)).toBeTruthy();
        console.log('Estimated gas:', gasEstimate.toString());

        const balanceBefore = await watcher.getAnkrBalance();

        // Deposit ANKR
        const depositReceipt = await watcher.depositAnkr(TEST_AMOUNT);
        expect(depositReceipt.status).toBe(1);

        const topicDeposited =
            watcher.ethBscBridge.interface.getEventTopic('TokensDeposited');
        const depositedLog = depositReceipt.logs.find(
            (l) => l.topics[0] === topicDeposited,
        );
        expect(depositedLog).toBeTruthy();

        const parsedDep = watcher.ethBscBridge.interface.parseLog(depositedLog);

        expect(parsedDep.args.from.toLowerCase())
            .toBe(watcher.MY_ADDRESS);
        expect(parsedDep.args.recipient.toLowerCase())
            .toBe(watcher.MY_ADDRESS);
        expect(parsedDep.args.chainId.toNumber())
            .toBe(Number(networks.sepolia.chainId));
        expect(parsedDep.args.amount.eq(
            ethers.utils.parseUnits(TEST_AMOUNT, 18),
        )).toBe(true);

        const balanceAfter = await watcher.getAnkrBalance();
        expect(Number(balanceBefore) - Number(balanceAfter)).toEqual(Number(TEST_AMOUNT));
    });

    test('ANKR deposit from Neura to Sepolia', async () => {
        test.setTimeout(TEST_TIMEOUT);

        const watcher = new BridgeDepositWatcher();
        const { messageHash } = await watcher.depositNativeOnNeura(TEST_AMOUNT, networks.sepolia.chainId);
        const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
        const approvalReceipt = await watcher.waitForApproval(messageHash, 30_000, blockStart);
        expect(approvalReceipt.status).toBe(1);

        const topicApproved =
            watcher.neuraBridge.interface.getEventTopic('BridgeTransferApproved');
        const approvedLog = approvalReceipt.logs.find(
            (l) => l.topics[0] === topicApproved,
        );
        const parsed = watcher.neuraBridge.interface.parseLog(approvedLog);
        expect(parsed.args._messageHash.toLowerCase()).toBe(
            messageHash.toLowerCase(),
        );
        expect(parsed.args.recipient.toLowerCase())
            .toBe(watcher.MY_ADDRESS);

        expect(parsed.args.chainId.toNumber())
            .toBe(Number(networks.sepolia.chainId));
        expect(parsed.args.sourceChainId.toNumber())
            .toBe(Number(networks.neuraTestnet.chainId));

        expect(parsed.args.amount.eq(
            ethers.utils.parseEther(TEST_AMOUNT),
        )).toBe(true);

        const sigsAfter = await watcher.getSignatureCount(messageHash);
        expect(sigsAfter).toEqual(10);

        const packedMessage = await watcher.getMessage(messageHash);
        expect(ethers.utils.isBytesLike(packedMessage)).toBe(true);
        expect(packedMessage.length).toBeGreaterThan(2);

        const claimRc = await watcher.claimTransfer(messageHash);
        expect(claimRc.status).toBe(1);
    });
});
