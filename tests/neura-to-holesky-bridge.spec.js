const { expect } = require('@playwright/test');
const { testWithNeuraAndHolesky: test } = require('../test-utils/testFixtures');
const { TEST_AMOUNT, TEST_TIMEOUT } = require('../constants/testConstants');

require('dotenv').config();

test.describe('Neura to Holesky Bridge UI Automation', () => {

  test('Verify Neura to Holesky Bridge', async ({ neuraBridgePage, context }) => {
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
        await neuraBridgePage.performNeuraToHoleskyBridge(context, TEST_AMOUNT);
        await neuraBridgePage.closeBridgeModal();
      });

      // Step 3: Verify balance changes
      expect(balances.ankrAfterBN.eq(balances.ankrBeforeBN)).toBe(true);
      expect(balances.ethAfterBN.eq(balances.ethBeforeBN)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Neura to Holesky bridge test: ${error.message}`);
      throw error;
    }
  });

  test('Verify claim transaction', async ({ neuraBridgePage, context }) => {
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
        await neuraBridgePage.performNeuraToHoleskyBridge(context, TEST_AMOUNT);
        await neuraBridgePage.closeBridgeModal();
      });

      // Step 3: Verify balance changes
      expect(balances.ankrAfterBN.eq(balances.ankrBeforeBN)).toBe(true);
      expect(balances.ethAfterBN.eq(balances.ethBeforeBN)).toBe(true);

      await neuraBridgePage.claimLatestTransaction(context);

    } catch (error) {
      console.error(`❌ Error in Neura to Holesky bridge test: ${error.message}`);
      throw error;
    }
  });
});
