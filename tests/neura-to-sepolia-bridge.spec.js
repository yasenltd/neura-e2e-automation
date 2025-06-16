import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';

const { ethers } = require('ethers');
const { expect } = require('@playwright/test');
const { testWithoutSepolia: test } = require('../test-utils/testFixtures');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');
const networks = require('../constants/networkConstants');
const BalanceTracker = require('../utils/BalanceTracker');

require('dotenv').config();

let performNeuraToSepoliaBridgeTest;

test.describe('Neura to Sepolia Bridge UI Automation', () => {

  test('Verify Neura to Sepolia Bridge', async ({ neuraBridgePage, context }) => {
    await performNeuraToSepoliaBridgeTest(neuraBridgePage, context);
  });

  test('Verify claim transaction', async ({ neuraBridgePage, context }) => {
    await performNeuraToSepoliaBridgeTest(neuraBridgePage, context, async (page, ctx) => {
      await neuraBridgePage.claimLatestTransaction(ctx, TEST_AMOUNT);
    });
  });
});

/**
 * Helper that performs the full Neura → Sepolia flow, then (optionally)
 * calls `additionalOperations` for chained assertions.
 */
performNeuraToSepoliaBridgeTest = async function (
  neuraBridgePage,
  context,
  additionalOperations = null,
) {
  test.setTimeout(TEST_TIMEOUT);

  const watcher = new BridgeDepositWatcher();
  const balanceTracker = new BalanceTracker();

  try {
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: { connect: true },
      switchNetworkDirection: true,          // Neura → Sepolia
    });

    const before = await balanceTracker.recordNeuraBalances();

    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.clickBridgeButton(false, TEST_AMOUNT);
    const messageHash = await watcher.predictNativeDepositHash(TEST_AMOUNT, networks.sepolia.chainId);
    console.log('📬 messageHash:', messageHash);

    await neuraBridgePage.bridgeTokensFromNeuraToChain(context);

    const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
    const approvalReceipt = await watcher.waitForApproval(messageHash, 60_000, blockStart);
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

    const after = await balanceTracker.recordNeuraBalances();
    const diff = balanceTracker.compareNeuraBalances(before, after);

    const expectedDrop = ethers.utils.parseEther(TEST_AMOUNT);
    const tolerance = ethers.BigNumber.from('10000000000000');

    expect(diff.ankrDiff.isNegative()).toBe(true);
    const error = diff.ankrDiff.abs().sub(expectedDrop).abs();
    expect(error.lte(tolerance)).toBe(true);

    if (additionalOperations) {
      await additionalOperations(neuraBridgePage, context);
    }
  } catch (err) {
    console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
    throw err;
  }
};
