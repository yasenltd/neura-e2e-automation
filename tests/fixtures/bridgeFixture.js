/**
 * Common test fixtures for Neura Bridge UI tests
 * This module provides reusable setup and teardown logic for test files
 */
import { test as baseTest } from '@playwright/test';
import WalletFactory            from '../../core/wallet/WalletFactory.js';
import BridgePage          from '../../pages/BridgePage.js';
import networks                 from '../../constants/networkConstants.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Creates a test fixture with common setup and teardown logic
 * @param {Object} options - Configuration options for the test fixture
 * @param {boolean} options.setupSepoliaNetwork - Whether to set up the Sepolia network (default: true)
 * @param {boolean} options.setupNeuraNetwork - Whether to set up the Neura network (default: true)
 * @returns {Object} - The configured test object with fixtures
 */
const createTestFixture = (options = { setupSepoliaNetwork: true, setupNeuraNetwork: true }) => {
  // Create a test object with slow() called to increase timeouts
  const slowTest = baseTest.extend({});
  slowTest.slow();

  return slowTest.extend({
    // Define fixtures that will be available in tests
    bridgePage: async ({ }, use) => {
      let wallet = null;
      let context = null;
      let bridgePageInstance = null;
      const walletType = 'metamask';

      try {
        // Mark tests as slow to increase timeouts
        slowTest.slow();

        // Validate required environment variables
        const config = {
          seedPhrase: process.env.SEED_PHRASE,
          password: process.env.WALLET_PASSWORD,
          bridgePageUrl: process.env.NEURA_TESTNET_URL,
        };

        if (!config.seedPhrase || !config.password || !config.bridgePageUrl) {
          console.error('Missing required environment variables: SEED_PHRASE, WALLET_PASSWORD, or NEURA URL must be set');
        }

        // Initialize browser with MetaMask
        const { wallet: walletInstance, context: browserContext } =
          await WalletFactory.createWallet(walletType);
        context = browserContext;
        wallet = walletInstance;

        // Setup wallet with credentials
        await wallet.importWallet(config.seedPhrase, config.password);

        // Initialize the Bridge page (this will also close unnecessary extension pages)
        bridgePageInstance = await BridgePage.initialize(context, config.bridgePageUrl);

        // Set wallet for the BridgePage using the strategy pattern
        await bridgePageInstance.setWallet(wallet);

        // Configure wallet to Neura Bridge Page
        const { extensionPage, previousPage } = await wallet.openExtension();

        // Setup networks based on options
        if (options.setupSepoliaNetwork) {
          await extensionPage.addAndSelectNetwork(networks.sepolia);
        }
        if (options.setupNeuraNetwork) {
          await extensionPage.addAndSelectNetwork(networks.neuraTestnet);
        }
        await extensionPage.closeExtension(previousPage);

        console.log('✅ Test setup completed successfully');

        // Store context and wallet on the bridgePageInstance object so they can be accessed in tests
        bridgePageInstance.context = context;
        bridgePageInstance.wallet = wallet;

        await use(bridgePageInstance);

        // Cleanup after test
        if (context) {
          await context.close();
          console.log('✅ Browser context closed successfully');
        }
      } catch (error) {
        console.error(`❌ Error in test setup: ${error.message}`);
        if (context) {
          await context.close();
        }
        throw error;
      }
    },

    wallet: async ({ bridgePage }, use) => {
      await use(bridgePage.wallet);
    },

    context: async ({ bridgePage }, use) => {
      await use(bridgePage.context);
    },
  });
};

/**
 * Test fixture without Sepolia network setup (only Neura)
 */
const testWithoutSepolia = createTestFixture({
  setupSepoliaNetwork: false,
  setupNeuraNetwork: true
});

/**
 * Test fixture without Neura network setup (only Sepolia)
 */
const testWithoutNeura = createTestFixture({
  setupSepoliaNetwork: true,
  setupNeuraNetwork: false
});

/**
 * Test fixture with both Neura and Sepolia networks setup
 */
const testWithNeuraAndSepolia = createTestFixture({
  setupSepoliaNetwork: true,
  setupNeuraNetwork: true
});

/**
 * Test fixture without both Neura and Sepolia networks setup
 */
const testWithoutNeuraAndSepolia = createTestFixture({
  setupSepoliaNetwork: false,
  setupNeuraNetwork: false
});

export {
  createTestFixture,
  testWithoutSepolia,
  testWithoutNeura,
  testWithNeuraAndSepolia,
  testWithoutNeuraAndSepolia
};