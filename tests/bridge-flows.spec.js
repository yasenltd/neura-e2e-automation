import { test, expect } from '@playwright/test';
import BalanceTracker from '../utils/BalanceTracker.js';
import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';
import { TEST_AMOUNT } from '../constants/testConstants.js';
import { TEST_TIMEOUT } from '../constants/timeoutConstants.js';
import networks from '../constants/networkConstants.js';
import * as assertionHelpers from '../pages/AssertionHelpers.js';

test.describe('Smart-contract bridge flows (no UI)', () => {
    test('ANKR deposit from Sepolia to Neura', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        await watcher.clearAnkrAllowance();
        await watcher.depositAnkr(TEST_AMOUNT, undefined, { approveOnly: true });
        const gasEstimate = await watcher.estimateDepositGas(TEST_AMOUNT);
        expect(gasEstimate.gt(0)).toBeTruthy();
        console.log('Estimated gas:', gasEstimate.toString());
        const balanceBefore = await watcher.getAnkrBalance();
        const depositReceipt = await watcher.depositAnkr(TEST_AMOUNT);
        const depositedLog = assertionHelpers.assertDepositReceipt(depositReceipt, watcher);
        await assertionHelpers.assertDepositLogDetails(depositedLog, watcher, networks, TEST_AMOUNT);
        const balanceAfter = await watcher.getAnkrBalance();
        expect(Number(balanceBefore) - Number(balanceAfter)).toEqual(Number(TEST_AMOUNT));
    });

    test('ANKR deposit from Neura to Sepolia', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();
        const before = await balanceTracker.recordNeuraBalances();
        const { messageHash } = await watcher.depositNativeOnNeura(TEST_AMOUNT, networks.sepolia.chainId);
        const parsed = await assertionHelpers.assertApprovalReceipt(watcher, messageHash, 120_000);
        await assertionHelpers.assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);
        await assertionHelpers.assertSignatureCount(watcher, messageHash);
        await assertionHelpers.assertPackedMessage(watcher, messageHash);
        const receipt = await watcher.claimTransfer(messageHash);
        await assertionHelpers.assertClaimReceipt(receipt, watcher.ethBscBridge,
            {
                recipient: watcher.MY_ADDRESS,
                amount: TEST_AMOUNT
            }
        );
        const after = await balanceTracker.recordNeuraBalances();
        await assertionHelpers.assertNeuraBalanceDifference(balanceTracker, before, after, TEST_AMOUNT);
    });
});
