import { test } from '@playwright/test';
import BalanceTracker from '../utils/BalanceTracker.js';
import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';
import { TEST_AMOUNT } from '../constants/testConstants.js';
import { TEST_TIMEOUT, TRANSACTION_APPROVAL_TIMEOUT } from '../constants/timeoutConstants.js';
import networks from '../constants/networkConstants.js';
import * as assertionHelpers from '../utils/AssertionHelpers.js';

test.describe('Smart-contract bridge flows (no UI)', () => {
    test('ANKR deposit from Sepolia to Neura', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        await watcher.clearAnkrAllowance();
        await watcher.depositAnkr(TEST_AMOUNT, undefined, { approveOnly: true });
        await watcher.estimateDepositGas(TEST_AMOUNT);
        const beforeBalances = await BalanceTracker.getAllBalances();
        const depositReceipt = await watcher.depositAnkr(TEST_AMOUNT);
        const depositedLog = assertionHelpers.assertDepositReceipt(depositReceipt, watcher);
        await assertionHelpers.assertDepositLogDetails(depositedLog, watcher, networks, TEST_AMOUNT);
        await new Promise(r => setTimeout(r, TRANSACTION_APPROVAL_TIMEOUT));
        const result = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, false);
        await assertionHelpers.assertSepoliaToNeuraBalanceChanges(result);
    });

    test('ANKR deposit from Neura to Sepolia', async () => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const beforeBalances = await BalanceTracker.getAllBalances();
        const { messageHash } = await watcher.depositNativeOnNeura(TEST_AMOUNT, networks.sepolia.chainId);
        const parsed = await assertionHelpers.assertApprovalReceipt(watcher, messageHash, 180_000);
        await new Promise(r => setTimeout(r, TRANSACTION_APPROVAL_TIMEOUT));
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
        const resultAfterClaim = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, true);
        await assertionHelpers.assertNeuraToSepoliaBalanceChanges(resultAfterClaim);
    });
});
