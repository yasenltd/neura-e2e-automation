/**
 * Common test fixtures for Neura Bridge UI tests
 * This module provides reusable setup and teardown logic for test files
 */
const { test: baseTest } = require('@playwright/test');
const WalletFactory = require('../factory/WalletFactory');
const NeuraBridgePage = require('../pages/NeuraBridgePage');
const networks = require('../constants/networkConstants');

require('dotenv').config();

/**
 * Creates a test fixture with common setup and teardown logic
 * @param {Object} options - Configuration options for the test fixture
 * @param {boolean} options.setupHoleskyNetwork - Whether to set up the Holesky network (default: true)
 * @param {boolean} options.setupNeuraNetwork - Whether to set up the Neura network (default: true)
 * @returns {Object} - The configured test object with fixtures
 */
const createTestFixture = (options = { setupHoleskyNetwork: true, setupNeuraNetwork: true }) => {
  // Create a test object with slow() called to increase timeouts
  const slowTest = baseTest.extend({});
  slowTest.slow();

  return slowTest.extend({
    // Define fixtures that will be available in tests
    neuraBridgePage: async ({ }, use) => {
      let wallet = null;
      let context = null;
      let neuraBridgePage = null;
      const walletType = 'metamask';

      try {
        // Mark tests as slow to increase timeouts
        slowTest.slow();

        // Validate required environment variables
        const config = {
          seedPhrase: process.env.PRIVATE_KEY,
          password: process.env.WALLET_PASSWORD,
          bridgePageUrl: process.env.NEURA_TESTNET_URL,
        };

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

        // Setup networks based on options
        if (options.setupHoleskyNetwork) {
          await extensionPage.addAndSelectNetwork(networks.holesky);
        }
        if (options.setupNeuraNetwork) {
          await extensionPage.addAndSelectNetwork(networks.neuraTestnet);
        }
        await extensionPage.closeExtension(previousPage);

        console.log('✅ Test setup completed successfully');

        // Store context and wallet on the neuraBridgePage object so they can be accessed in tests
        neuraBridgePage.context = context;
        neuraBridgePage.wallet = wallet;

        await use(neuraBridgePage);

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

    wallet: async ({ neuraBridgePage }, use) => {
      await use(neuraBridgePage.wallet);
    },

    context: async ({ neuraBridgePage }, use) => {
      await use(neuraBridgePage.context);
    },
  });
};

/**
 * Test fixture without Holesky network setup (only Neura)
 */
const testWithoutHolesky = createTestFixture({ 
  setupHoleskyNetwork: false, 
  setupNeuraNetwork: true 
});

/**
 * Test fixture without Neura network setup (only Holesky)
 */
const testWithoutNeura = createTestFixture({ 
  setupHoleskyNetwork: true, 
  setupNeuraNetwork: false 
});

/**
 * Test fixture with both Neura and Holesky networks setup
 */
const testWithNeuraAndHolesky = createTestFixture({ 
  setupHoleskyNetwork: true, 
  setupNeuraNetwork: true 
});

/**
 * Test fixture without both Neura and Holesky networks setup
 */
const testWithoutNeuraAndHolesky = createTestFixture({ 
  setupHoleskyNetwork: false, 
  setupNeuraNetwork: false 
});

module.exports = {
  createTestFixture,
  testWithoutHolesky,
  testWithoutNeura,
  testWithNeuraAndHolesky,
  testWithoutNeuraAndHolesky
};
