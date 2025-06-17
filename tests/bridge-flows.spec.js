const { test, expect } = require('@playwright/test');
const { ethers } = require('ethers');
const BridgeDepositWatcher = require('../utils/BridgeDepositWatcher');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');
const networks = require('../constants/networkConstants');
const { assertBridgeTransferLog, assertSignatureCount, assertPackedMessage, assertApprovalReceipt } = require('../pages/AssertionHelpers');

test.describe('Smart-contract bridge flows (no UI)', () => {
    test('ANKR deposit from Sepolia to Neura', async () => {
        test.setTimeout(TEST_TIMEOUT);

        const watcher = new BridgeDepositWatcher();
        await watcher.depositAnkr(TEST_AMOUNT, undefined, { approveOnly: true });

        const gasEstimate = await watcher.estimateDepositGas(TEST_AMOUNT);
        expect(gasEstimate.gt(0)).toBeTruthy();
        console.log('Estimated gas:', gasEstimate.toString());

        const balanceBefore = await watcher.getAnkrBalance();

        const depositReceipt = await watcher.depositAnkr(TEST_AMOUNT);
        expect(depositReceipt.status).toBe(1);

        const topicDeposited = watcher.ethBscBridge.interface.getEventTopic('TokensDeposited');
        const depositedLog = depositReceipt.logs.find((l) => l.topics[0] === topicDeposited);
        expect(depositedLog).toBeTruthy();

        const parsedDep = watcher.ethBscBridge.interface.parseLog(depositedLog);
        expect(parsedDep.args.from.toLowerCase()).toBe(watcher.MY_ADDRESS);
        expect(parsedDep.args.recipient.toLowerCase()).toBe(watcher.MY_ADDRESS);
        expect(parsedDep.args.chainId.toNumber()).toBe(Number(networks.sepolia.chainId));
        expect(parsedDep.args.amount.eq(ethers.utils.parseUnits(TEST_AMOUNT, 18),)).toBe(true);

        const balanceAfter = await watcher.getAnkrBalance();
        expect(Number(balanceBefore) - Number(balanceAfter)).toEqual(Number(TEST_AMOUNT));
    });

    test('ANKR deposit from Neura to Sepolia', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const { messageHash } = await watcher.depositNativeOnNeura(TEST_AMOUNT, networks.sepolia.chainId);
        const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
        const parsed = await assertApprovalReceipt(watcher, messageHash, 75_000, blockStart);
        await assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);
        await assertSignatureCount(watcher, messageHash);
        await assertPackedMessage(watcher, messageHash);
        const claimRc = await watcher.claimTransfer(messageHash);
    });
});
