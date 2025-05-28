const { test, expect } = require('@playwright/test');
const WalletFactory = require('../factory/WalletFactory');
const NeuraBridgePage = require('../pages/NeuraBridgePage');
const networks = require('../constants/networkConstants');

require('dotenv').config();

test.describe('Neura to Holesky Bridge UI Automation', () => {
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

  /**
   * Test to verify the bridge functionality from Neura to Holesky
   * This test checks that tokens can be successfully bridged from Neura to Holesky
   */
  test('Verify Neura to Holesky Bridge', async () => {
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
      });

      // Step 3: Verify balance changes
      expect(balances.ankrAfterBN.eq(balances.ankrBeforeBN)).toBe(true);
      expect(balances.ethAfterBN.eq(balances.ethBeforeBN)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Neura to Holesky bridge test: ${error.message}`);
      throw error;
    }
  });
});