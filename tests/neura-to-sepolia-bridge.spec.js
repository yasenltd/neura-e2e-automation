import { testWithoutSepolia as test} from '../fixtures/testFixtures.js';
import BalanceTracker                     from '../utils/BalanceTracker.js';
import BridgeDepositWatcher               from '../utils/BridgeDepositWatcher.js';
import networks                           from '../constants/networkConstants.js';
import { TEST_AMOUNT }                    from '../constants/testConstants.js';
import { TEST_TIMEOUT, BRIDGE_OPERATION_TIMEOUT } from '../constants/timeoutConstants.js';
import * as assertionHelpers from '../utils/AssertionHelpers.js';

import dotenv from 'dotenv';
dotenv.config();

/**
 * Initializes bridge and performs bridge operation from Neura to Sepolia
 * @param {Object} bridgePage - The bridge page object
 * @param {Object} context - The test context
 * @param {Object} watcher - The bridge deposit watcher
 * @param {Object} balanceTracker - The balance tracker
 * @returns {Object} - Object containing messageHash, parsed, blockStart, and before balance
 */
async function initializeAndBridgeFromNeuraToSepolia(bridgePage, context, watcher) {
    await bridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {connect: true},
        switchNetworkDirection: true,
    });
    const beforeBalances = await BalanceTracker.getAllBalances();
    await bridgePage.fillAmount(TEST_AMOUNT);
    await bridgePage.clickBridgeButton(false, TEST_AMOUNT);
    const messageHash = await watcher.predictNativeDepositHash(TEST_AMOUNT, networks.sepolia.chainId);
    await bridgePage.bridgeTokensFromNeuraToChain(context);
    const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
    const parsed = await assertionHelpers.assertApprovalReceipt(watcher, messageHash, BRIDGE_OPERATION_TIMEOUT);
    await assertionHelpers.assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);
    return { messageHash, parsed, blockStart, beforeBalances };
}

test.describe('Neura to Sepolia Bridge UI Automation', () => {

    test('Verify Neura to Sepolia Bridge transaction via UI and Claim transaction via SC call', async ({bridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();

        try {
            const { messageHash, parsed, blockStart, beforeBalances } = await initializeAndBridgeFromNeuraToSepolia(
                bridgePage, context, watcher, balanceTracker
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
            const resultAfterClaim = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, true);
            await assertionHelpers.assertNeuraToSepoliaBalanceChanges(resultAfterClaim);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });

    test('Verify Neura to Sepolia Bridge and Claim transactions via UI', { tag: '@scheduledRun' }, async ({bridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();

        try {
            const { messageHash, parsed, blockStart, beforeBalances } = await initializeAndBridgeFromNeuraToSepolia(
                bridgePage, context, watcher, balanceTracker
            );
            await bridgePage.claimLatestTransaction(context, TEST_AMOUNT);
            await assertionHelpers.assertSignatureCount(watcher, messageHash);
            const resultAfterClaim = await BalanceTracker.compareBalances(beforeBalances, TEST_AMOUNT, true);
            await assertionHelpers.assertNeuraToSepoliaBalanceChanges(resultAfterClaim);

            const newBalances = await BalanceTracker.getAllBalances();
            await bridgePage.verifyUIBalanceMatchesNeuraChain(newBalances);
            await bridgePage.switchNetworkDirection();
            await bridgePage.reloadPreservingAuth();
            await bridgePage.verifyUIBalanceMatchesChain(newBalances);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });
});
