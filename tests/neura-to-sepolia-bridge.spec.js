import { testWithoutSepolia as test } from '../test-utils/testFixtures.js';
import BalanceTracker                     from '../utils/BalanceTracker.js';
import BridgeDepositWatcher               from '../utils/BridgeDepositWatcher.js';
import networks                           from '../constants/networkConstants.js';
import { TEST_AMOUNT }                    from '../constants/testConstants.js';
import { TEST_TIMEOUT }                   from '../constants/timeoutConstants.js';
import * as assertionHelpers from '../pages/AssertionHelpers.js';

import dotenv from 'dotenv';
dotenv.config();

/**
 * Initializes bridge and performs bridge operation from Neura to Sepolia
 * @param {Object} neuraBridgePage - The bridge page object
 * @param {Object} context - The test context
 * @param {Object} watcher - The bridge deposit watcher
 * @param {Object} balanceTracker - The balance tracker
 * @returns {Object} - Object containing messageHash, parsed, blockStart, and before balance
 */
async function initializeAndBridgeFromNeuraToSepolia(neuraBridgePage, context, watcher, balanceTracker) {
    await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {connect: true},
        switchNetworkDirection: true,
    });
    const beforeBalances = await balanceTracker.recordNeuraBalances();
    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.clickBridgeButton(false, TEST_AMOUNT);
    const messageHash = await watcher.predictNativeDepositHash(TEST_AMOUNT, networks.sepolia.chainId);
    console.log('📬 messageHash:', messageHash);
    await neuraBridgePage.bridgeTokensFromNeuraToChain(context);
    const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
    const parsed = await assertionHelpers.assertApprovalReceipt(watcher, messageHash, 60_000, blockStart);
    await assertionHelpers.assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);
    return { messageHash, parsed, blockStart, beforeBalances };
}

test.describe('Neura to Sepolia Bridge UI Automation', () => {

    test('Verify Neura to Sepolia Bridge transaction via UI and Claim transaction via SC call', async ({neuraBridgePage, context}) => {

        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();

        try {
            const { messageHash, parsed, blockStart, before } = await initializeAndBridgeFromNeuraToSepolia(
                neuraBridgePage, context, watcher, balanceTracker
            );
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
            assertionHelpers.assertNeuraBalanceDifference(balanceTracker, before, after, TEST_AMOUNT);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });

    test('Verify Neura to Sepolia Bridge and Claim transactions via UI',
        { tag: '@scheduledRun' },
        async ({neuraBridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();

        try {
            const { messageHash, parsed, blockStart, beforeBalances } = await initializeAndBridgeFromNeuraToSepolia(
                neuraBridgePage, context, watcher, balanceTracker
            );
            await neuraBridgePage.claimLatestTransaction(context, TEST_AMOUNT);
            const afterBalances = await balanceTracker.recordNeuraBalances();
            const balances = balanceTracker.compareBalances(beforeBalances, afterBalances);
            assertionHelpers.assertNeuraBalanceDifference(balanceTracker, beforeBalances, afterBalances, TEST_AMOUNT);
            await neuraBridgePage.verifyUIBalanceMatchesChain(balances);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });
});
