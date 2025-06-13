import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';

const { expect } = require('@playwright/test');
const { testWithoutSepolia: test } = require('../test-utils/testFixtures');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');
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
    /* 1️⃣  Prepare the UI & connect wallet */
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: { connect: true },
      switchNetworkDirection: true,          // Neura → Sepolia
    });

    /* 2️⃣  Record balances before */
    const beforeBalances = await balanceTracker.recordBalances();

    /* 3️⃣  Drive the browser (fill + approve) */
    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.clickBridgeButton(false, TEST_AMOUNT);
    const blockStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);
    console.log('Block start', blockStart);
    await neuraBridgePage.bridgeTokensFromNeuraToChain(context);
    /* 4️⃣  Marker block BEFORE user signs */

    /* 5️⃣  Catch the Neura TokensDeposited event */
    const { parsed } = await watcher.waitForNextDepositOnNeura(blockStart, TEST_TIMEOUT);

    const messageHash = await watcher.getMessageHashFromEvent(parsed);
    console.log('📬 messageHash:', messageHash);
    // block marker captured right after TokensDeposited arrived
    const approvalStart = await watcher.getFreshBlockNumber(watcher.neuraProvider);

    // wait up to 30 s from that block
    // await watcher.waitForApproval(messageHash, 30_000, approvalStart);
    const claimRc = await watcher.claimTransfer(messageHash);
    expect(claimRc.status).toBe(1);

    /* 7️⃣  Record balances after & basic sanity */
    const afterBalances = await balanceTracker.recordBalances();
    const diff = balanceTracker.compareBalances(beforeBalances, afterBalances);

    expect(diff.ankrAfterBN.lte(diff.ankrBeforeBN)).toBe(true);
    expect(diff.ethAfterBN.lte(diff.ethBeforeBN)).toBe(true);

    /* 8️⃣  Extra checks */
    if (additionalOperations) {
      await additionalOperations(neuraBridgePage, context);
    }
  } catch (err) {
    console.error(`❌ Neura → Sepolia bridge test failed: ${err.message}`);
    throw err;
  }
};
