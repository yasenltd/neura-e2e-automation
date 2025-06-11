const { expect } = require('@playwright/test');
const { testWithoutSepolia: test } = require('../test-utils/testFixtures');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');

require('dotenv').config();

let performNeuraToSepoliaBridgeTest;

test.describe('Neura to Sepolia Bridge UI Automation', () => {

  test('Verify Neura to Sepolia Bridge', async ({ neuraBridgePage, context }) => {
    await performNeuraToSepoliaBridgeTest(neuraBridgePage, context);
  });

  test('Verify claim transaction', async ({ neuraBridgePage, context }) => {
    await performNeuraToSepoliaBridgeTest(neuraBridgePage, context, async (page, ctx) => {
      await page.claimLatestTransaction(ctx);
    });
  });
});

/**
 * Helper function to perform common Neura to Sepolia bridge operations
 * @param {Object} neuraBridgePage - The Neura bridge page object
 * @param {Object} context - The test context
 * @param {Function} [additionalOperations] - Optional function to perform additional operations after bridge
 * @returns {Promise<void>}
 */
performNeuraToSepoliaBridgeTest = async function(neuraBridgePage, context, additionalOperations = null) {
  test.setTimeout(TEST_TIMEOUT);

  try {
    // Step 1: Initialize bridge with options (with wallet connection, with network switch)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true
      },
      switchNetworkDirection: true
    });

    // Step 2: Record balances and perform the bridge operation
    const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
      await neuraBridgePage.performNeuraToSepoliaBridge(context, TEST_AMOUNT);
    });

    // Step 3: Verify balance changes
    expect(balances.ankrAfterBN.eq(balances.ankrBeforeBN)).toBe(true);
    expect(balances.ethAfterBN.eq(balances.ethBeforeBN)).toBe(true);

    // Step 4: Perform any additional operations if provided
    if (additionalOperations) {
      await additionalOperations(neuraBridgePage, context);
    }
  } catch (error) {
    console.error(`❌ Error in Neura to Sepolia bridge test: ${error.message}`);
    throw error;
  }
};
