const { test, expect } = require('@playwright/test');
const BridgeDepositWatcher = require('../utils/BridgeDepositWatcher');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');
const networks = require('../constants/networkConstants');
const { assertBridgeTransferLog, assertSignatureCount, assertPackedMessage, assertApprovalReceipt, assertDepositReceipt, assertDepositLogDetails } = require('../pages/AssertionHelpers');

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
        const depositedLog = assertDepositReceipt(depositReceipt, watcher);
        await assertDepositLogDetails(depositedLog, watcher, networks, TEST_AMOUNT);
        const balanceAfter = await watcher.getAnkrBalance();
        expect(Number(balanceBefore) - Number(balanceAfter)).toEqual(Number(TEST_AMOUNT));
    });

    test('ANKR deposit from Neura to Sepolia', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const { messageHash } = await watcher.depositNativeOnNeura(TEST_AMOUNT, networks.sepolia.chainId);
        const parsed = await assertApprovalReceipt(watcher, messageHash, 60_000);
        await assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);
        await assertSignatureCount(watcher, messageHash);
        await assertPackedMessage(watcher, messageHash);
        const claimRc = await watcher.claimTransfer(messageHash);
    });
});
