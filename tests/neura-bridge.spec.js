import { ethers } from 'ethers';
import BridgeDepositWatcher from '../scripts/BridgeDepositWatcher';
const { test, expect } = require('@playwright/test');
const WalletFactory = require('../factory/WalletFactory');
const NeuraBridgePage = require('../pages/NeuraBridgePage');
const networks = require('../constants/networkConstants');
const { neuraBridgeAssertions } = require('../constants/assertionConstants');
const { waitForAnyDepositInSubgraph } = require('../utils/subgraph');

require('dotenv').config();

/**
 * Neura Bridge UI Automation Test Suite
 * 
 * This test suite verifies the functionality of the Neura Bridge UI, including:
 * - Page layout verification before and after wallet connection
 * - Network switching functionality
 * - Bridge operations from Holesky to Neura and vice versa
 * 
 * Prerequisites:
 * - MetaMask extension installed
 * - Valid wallet credentials in .env file
 * - Access to Holesky and Neura testnets
 */

test.describe('Neura Bridge UI Automation', () => {
  // Test configuration and shared variables
  let wallet;
  let context;
  let neuraBridgePage;
  const walletType = 'metamask';

  // Test constants
  const TEST_AMOUNT = '0.000001'; // Amount used for bridge tests
  const TEST_TIMEOUT = 180_000; // 3 minutes timeout for bridge operations in case of network delays

  const config = {
    seedPhrase: process.env.PRIVATE_KEY,
    password: process.env.WALLET_PASSWORD,
    dappUrl: process.env.DAPP_URL,
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
      if (!config.seedPhrase || !config.password || !config.dappUrl) {
        throw new Error(
          'Missing required environment variables: PRIVATE_KEY, WALLET_PASSWORD, and DAPP_URL must be set',
        );
      }

      // Initialize browser with MetaMask
      const { wallet: walletInstance, context: browserContext } =
        await WalletFactory.createWallet(walletType);
      context = browserContext;
      wallet = walletInstance;

      // Setup wallet with credentials
      await wallet.importWallet(config.seedPhrase, config.password);

      // Initialize the dApp page (this will also close unnecessary extension pages)
      neuraBridgePage = await NeuraBridgePage.initialize(context, config.dappUrl);

      // Set wallet for the NeuraBridgePage using the strategy pattern
      await neuraBridgePage.setWallet(wallet);

      // Configure wallet for Neura Test Network
      const { extensionPage, previousPage } = await wallet.openExtension();
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
   * Test to verify the Neura Bridge page layout before wallet connection
   * This test checks that the UI elements are displayed correctly in the initial state
   */
  test('Verify Neura Bridge Page Layout before wallet is connected', async () => {
    try {
      // Step 1: Verify initial layout with Holesky as source and Neura as destination
      const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
      await neuraBridgePage.assertNetworkLabels(
        pageLayout, 
        neuraBridgeAssertions.pageLayout.networks.holesky, 
        neuraBridgeAssertions.pageLayout.networks.neuraTestnet
      );

      // Step 2: Switch the bridge network direction
      await neuraBridgePage.switchBridgeNetwork();

      // Step 3: Verify the layout after switching (Neura as source, Holesky as destination)
      const newPageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
      await neuraBridgePage.assertNetworkLabels(
        newPageLayout, 
        neuraBridgeAssertions.pageLayout.networks.neuraTestnet, 
        neuraBridgeAssertions.pageLayout.networks.holesky
      );
    } catch (error) {
      console.error(`❌ Error verifying page layout: ${error.message}`);
      throw error;
    }
  });

  /**
   * Test to verify the page layout after connecting MetaMask wallet
   * This test checks that the UI elements are displayed correctly after wallet connection
   */
  test('Verify Neura Bridge Page Layout after MetaMask wallet is connected', async () => {
    // Step 1: Connect wallet and verify wallet screen
    await neuraBridgePage.connectMetaMaskWallet(context);
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Verify initial layout with Holesky as source and Neura as destination
    const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(pageLayout, neuraBridgeAssertions.pageLayout.networks.holesky, neuraBridgeAssertions.pageLayout.networks.neuraTestnet);

    // Step 3: Verify that the Enter Amount button is disabled initially
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    // Step 4: Fill amount and switch network
    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.switchBridgeNetwork();

    // Step 5: Verify layout after switching networks
    const newPageLayout = await neuraBridgePage.retrieveBridgeLayoutData();
    await neuraBridgePage.assertNetworkLabels(newPageLayout, neuraBridgeAssertions.pageLayout.networks.neuraTestnet, neuraBridgeAssertions.pageLayout.networks.holesky);
  });

  /**
   * Test to verify the bridge functionality from Holesky to Neura
   * This test checks that tokens can be successfully bridged from Holesky to Neura
   */
  test('Verify Holesky to Neura Bridge', async () => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Setup test data and record initial balance
    const from = process.env.MY_ADDRESS.toLowerCase();
    const rawAmount = ethers.utils.parseUnits(TEST_AMOUNT, 18); // BigNumber
    const amount = rawAmount.toString(); // String representation of the amount in wei
    const watcher = new BridgeDepositWatcher();
    const balanceBefore = await watcher.getAnkrBalance();

    // Step 2: Connect wallet and initiate bridge transaction
    await neuraBridgePage.connectMetaMaskWallet(context);
    await neuraBridgePage.fillAmount(TEST_AMOUNT);
    await neuraBridgePage.clickBridgeButton();

    // Step 3: Approve token transfer and wait for deposit to be recorded
    await neuraBridgePage.approveTokenTransfer(context);

    try {
      const deposit = await waitForAnyDepositInSubgraph(from, amount);
      expect(deposit).toBeTruthy();
    } catch (error) {
      console.error(`❌ Error waiting for deposit: ${error.message}`);
      throw error;
    }

    // Step 4: Verify balance changes
    const balanceAfter = await watcher.getAnkrBalance();
    console.log(`🧮 Balance before: ${balanceBefore}`);
    console.log(`🧮 Balance after:  ${balanceAfter}`);

    // Step 5: Calculate and verify the difference in balances
    const before = ethers.utils.parseUnits(balanceBefore, 18);
    const after = ethers.utils.parseUnits(balanceAfter, 18);
    const diff = after.sub(before);
    console.log('💡 rawAmount:', rawAmount.toString());
    console.log('💡 diff     :', diff.toString());

    // The balance should decrease or remain the same after bridging
    expect(diff.lte(ethers.constants.Zero)).toBe(true);
  });

  /**
   * Test to verify the bridge functionality from Neura to Holesky
   * This test checks that tokens can be successfully bridged from Neura to Holesky
   */
  test('Verify Neura to Holesky Bridge', async () => {
    test.setTimeout(TEST_TIMEOUT);
    const watcher = new BridgeDepositWatcher();

    try {
      // Step 1: Record balances before bridging
      const ankrBefore = await watcher.getAnkrBalance();
      const ethBefore = await watcher.getEthBalance();

      // Step 2: Connect wallet and verify initial layout
      await neuraBridgePage.connectMetaMaskWallet(context);
      const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
      await neuraBridgePage.assertNetworkLabels(
        pageLayout,
        neuraBridgeAssertions.pageLayout.networks.holesky,
        neuraBridgeAssertions.pageLayout.networks.neuraTestnet
      );

      // Step 3: Switch network direction (to Neura -> Holesky)
      await neuraBridgePage.switchBridgeNetwork();

      // Step 4: Verify layout after switching
      const newPageLayout = await neuraBridgePage.retrieveBridgeLayoutData();
      await neuraBridgePage.assertNetworkLabels(
        newPageLayout,
        neuraBridgeAssertions.pageLayout.networks.neuraTestnet,
        neuraBridgeAssertions.pageLayout.networks.holesky
      );

      // Step 5: Fill amount and initiate bridge transaction
      await neuraBridgePage.fillAmount(TEST_AMOUNT);
      await neuraBridgePage.clickBridgeButton();

      // Step 6: Verify preview transaction screen and proceed
      const previewTransactionLayout = await neuraBridgePage.assertPreviewTransactionLayout();
      await neuraBridgePage.verifyPreviewTransactionLabels(previewTransactionLayout);
      await neuraBridgePage.bridgeTokens(context);
      await neuraBridgePage.claimTokens();

      // Step 7: Record balances after bridge
      const ankrAfter = await watcher.getAnkrBalance();
      const ethAfter = await watcher.getEthBalance();

      console.log(`🪙 ANKR before: ${ankrBefore}`);
      console.log(`🪙 ANKR after : ${ankrAfter}`);
      console.log(`💰 ETH before : ${ethBefore}`);
      console.log(`💰 ETH after  : ${ethAfter}`);

      // Step 8: Parse balances as BigNumbers and calculate differences
      const ankrBeforeBN = ethers.utils.parseUnits(ankrBefore, 18);
      const ankrAfterBN = ethers.utils.parseUnits(ankrAfter, 18);
      const ethBeforeBN = ethers.utils.parseEther(ethBefore);
      const ethAfterBN = ethers.utils.parseEther(ethAfter);

      const ankrDiff = ankrAfterBN.sub(ankrBeforeBN);
      const ethDiff = ethAfterBN.sub(ethBeforeBN);

      console.log('💡 ANKR diff:', ankrDiff.toString());
      console.log('💡 ETH diff :', ethDiff.toString());

      // Step 9: Final balances are still equal before ETH claim
      expect(ankrAfterBN.eq(ankrBeforeBN)).toBe(true);
      expect(ethAfterBN.eq(ethBeforeBN)).toBe(true);
    } catch (error) {
      console.error(`❌ Error in Neura to Holesky bridge test: ${error.message}`);
      throw error;
    }
  });
});
