import { ethers } from 'ethers';
const { test, expect } = require('@playwright/test');
const WalletFactory = require('../factory/WalletFactory');
const NeuraBridgePage = require('../pages/NeuraBridgePage');
const networks = require('../constants/networkConstants');
const { waitForAnyDepositInSubgraph } = require('../utils/subgraphQueryUtil');

require('dotenv').config();

test.describe('Holesky to Neura Bridge UI Automation', () => {
  // Test configuration and shared variables
  let wallet;
  let context;
  let neuraBridgePage;
  const walletType = 'metamask';

  // Test constants
  const TEST_AMOUNT = '0.000001'; // Amount used for bridge tests
  const TEST_TIMEOUT = 180_000; // Timeout for bridge operations in case of network delays

  const config = {
    seedPhrase: process.env.PRIVATE_KEY,
    password: process.env.WALLET_PASSWORD,
    bridgePageUrl: process.env.NEURA_TESTNET_URL,
  };

  /**
   * Setup before each test
   * - Validates environment variables
   * - Initializes browser with MetaMask
   * - Sets up wallet with credentials
   * - Initializes the dApp page
   * - Configures wallet for Neura Test Network
   */
  test.beforeEach(async () => {
    test.slow(); // Mark tests as slow to increase timeouts

    try {
      // Validate required environment variables
      if (!config.seedPhrase || !config.password || !config.bridgePageUrl) {
        throw new Error(
          'Missing required environment variables: PRIVATE_KEY, WALLET_PASSWORD, and NEURA URL must be set',
        );
      }

      // Initialize browser with MetaMask
      const { wallet: walletInstance, context: browserContext } =
        await WalletFactory.createWallet(walletType);
      context = browserContext;
      wallet = walletInstance;

      // Setup wallet with credentials
      await wallet.importWallet(config.seedPhrase, config.password);

      // Initialize the Bridge page (this will also close unnecessary extension pages)
      neuraBridgePage = await NeuraBridgePage.initialize(context, config.bridgePageUrl);

      // Set wallet for the NeuraBridgePage using the strategy pattern
      await neuraBridgePage.setWallet(wallet);

      // Configure wallet to Neura Bridge Page
      const { extensionPage, previousPage } = await wallet.openExtension();
      // await extensionPage.addAndSelectNetwork(networks.holesky);
      await extensionPage.addAndSelectNetwork(networks.neuraTestnet);
      await extensionPage.closeExtension(previousPage);

      console.log('✅ Test setup completed successfully');
    } catch (error) {
      console.error(`❌ Error in test setup: ${error.message}`);
      throw error;
    }
  });

  /**
   * Cleanup after each test
   * - Closes the browser context to clean up resources
   */
  test.afterEach(async () => {
    try {
      if (context) {
        await context.close();
        console.log('✅ Browser context closed successfully');
      }
    } catch (error) {
      console.error(`❌ Error in test cleanup: ${error.message}`);
    }
  });

  test('Verify Holesky to Neura only approve transaction', async () => {
    test.setTimeout(TEST_TIMEOUT);

    try {
      // Step 2: Initialize bridge with options (with wallet connection, no network switch)
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: true
        },
        switchNetworkDirection: false
      });

      // Step 3: Record balances and perform the bridge operation
      const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
        // Pass 'true' for approvalStepOnly to only perform token approval (first step of bridging) without completing the bridge
        await neuraBridgePage.performHoleskyToNeuraOperation(context, TEST_AMOUNT, true);
        await neuraBridgePage.closeBridgeModal();
      });

      // Step 4: Verify balance changes
      // The balance should decrease or remain the same after bridging from Holesky to Neura
      expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Holesky to Neura bridge test: ${error.message}`);
      throw error;
    }
  });

  test('Verify Holesky to Neura only bridge transaction', async () => {
    test.setTimeout(TEST_TIMEOUT);
    try {
      // Step 1: Initialize bridge with options (with wallet connection, no network switch)
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: true
        },
        switchNetworkDirection: false
      });

      // Step 3: Record balances and perform the bridge operation
      const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
        await neuraBridgePage.clickBridgeButton(false);
      });

      // Step 4: Verify balance changes
      // The balance should decrease or remain the same after bridging from Holesky to Neura
      expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Holesky to Neura bridge test: ${error.message}`);
      throw error;
    }
  });

  test('Verify Holesky to Neura approve transaction and then bridge transaction', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Setup test data
    const from = process.env.MY_ADDRESS.toLowerCase();
    const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18); // BigNumber
    const amount = rawAmount.toString(); // String representation of the amount in wei

    try {
      // Step 2: Initialize bridge with options (with wallet connection, no network switch)
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: true
        },
        switchNetworkDirection: false
      });

      // Step 3: Record balances and perform the bridge operation
      const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
        // Pass 'true' for approvalStepOnly to only perform token approval (first step of bridging) without completing the bridge
        await neuraBridgePage.performHoleskyToNeuraOperation(context, TEST_AMOUNT, true);
        await neuraBridgePage.closeBridgeModal();
        await neuraBridgePage.clickBridgeButton(false);
      });

      // Step 4: Verify balance changes
      // The balance should decrease or remain the same after bridging from Holesky to Neura
      expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Holesky to Neura bridge test: ${error.message}`);
      throw error;
    }
  });

  /**
   * Test to verify the bridge functionality from Holesky to Neura
   * This test checks that tokens can be successfully bridged from Holesky to Neura
   */
  test('Verify Holesky to Neura Bridge', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Setup test data
    const from = process.env.MY_ADDRESS.toLowerCase();
    const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18); // BigNumber
    const amount = rawAmount.toString(); // String representation of the amount in wei

    try {
      // Step 2: Initialize bridge with options (with wallet connection, no network switch)
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: true
        },
        switchNetworkDirection: false
      });

      // Step 3: Record balances and perform the bridge operation
      const balances = await neuraBridgePage.recordAndCompareBalances(async () => {
        // Pass 'false' for approvalStepOnly to perform the complete bridging process (approve token transfer AND bridge tokens)
        await neuraBridgePage.performHoleskyToNeuraOperation(context, TEST_AMOUNT, false);

        // Wait for deposit confirmation in subgraph
        const deposit = await waitForAnyDepositInSubgraph(from, amount);
        expect(deposit).toBeTruthy();
      });

      // Step 4: Verify balance changes
      // The balance should decrease or remain the same after bridging from Holesky to Neura
      expect(balances.ankrDiff.lte(ethers.constants.Zero)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Holesky to Neura bridge test: ${error.message}`);
      throw error;
    }
  });
});