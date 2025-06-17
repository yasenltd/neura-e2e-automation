import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';

const {testWithoutSepolia: test} = require('../test-utils/testFixtures');
const {TEST_AMOUNT, TEST_TIMEOUT} = require('../constants/testConstants');
const networks = require('../constants/networkConstants');
const BalanceTracker = require('../utils/BalanceTracker');
const {
    assertNeuraBalanceDifference,
    assertBridgeTransferLog,
    assertSignatureCount,
    assertPackedMessage,
    assertApprovalReceipt
} = require('../pages/AssertionHelpers');

require('dotenv').config();

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
    const before = await balanceTracker.recordNeuraBalances();
    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.clickBridgeButton(false, TEST_AMOUNT);
    const messageHash = await watcher.predictNativeDepositHash(TEST_AMOUNT, networks.sepolia.chainId);
    console.log('📬 messageHash:', messageHash);
    await neuraBridgePage.bridgeTokensFromNeuraToChain(context);
    const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
    const parsed = await assertApprovalReceipt(watcher, messageHash, 60_000, blockStart);
    await assertBridgeTransferLog(parsed, messageHash, watcher, TEST_AMOUNT, networks);

    return { messageHash, parsed, blockStart, before };
}

test.describe('Neura to Sepolia Bridge UI Automation', () => {

    test('Verify Neura to Sepolia Bridge', async ({neuraBridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);
        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();
        try {
            const { messageHash, parsed, blockStart, before } = await initializeAndBridgeFromNeuraToSepolia(
                neuraBridgePage, context, watcher, balanceTracker
            );
            await assertSignatureCount(watcher, messageHash);
            await assertPackedMessage(watcher, messageHash);
            const claimRc = await watcher.claimTransfer(messageHash);
            const after = await balanceTracker.recordNeuraBalances();
            assertNeuraBalanceDifference(balanceTracker, before, after, TEST_AMOUNT);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });

    test('Verify claim transaction', async ({neuraBridgePage, context}) => {
        test.setTimeout(TEST_TIMEOUT);

        const watcher = new BridgeDepositWatcher();
        const balanceTracker = new BalanceTracker();

        try {
            const { messageHash, parsed, blockStart, before } = await initializeAndBridgeFromNeuraToSepolia(
                neuraBridgePage, context, watcher, balanceTracker
            );
            await neuraBridgePage.claimLatestTransaction(context, TEST_AMOUNT);
            const after = await balanceTracker.recordNeuraBalances();
            assertNeuraBalanceDifference(balanceTracker, before, after, TEST_AMOUNT);
        } catch (err) {
            console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
            throw err;
        }
    });
});
