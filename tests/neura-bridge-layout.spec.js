const { expect } = require('@playwright/test');
const { testWithNeuraAndHolesky: test } = require('../test-utils/testFixtures');
const {neuraBridgeAssertions} = require("../constants/assertionConstants");
const { TEST_AMOUNT } = require('../constants/testConstants');

require('dotenv').config();

test.describe('Neura Bridge page validation', () => {

  test('Verify Neura Bridge page without connected wallet', async ({ neuraBridgePage, context }) => {
    try {
      // Step 1: Initialize bridge with options (no wallet connection, with network switch, verify page layout)
      // This will automatically switch the network direction and verify the layout after switching
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: true
      });

      // Step 2: Verify that the Enter Amount button is disabled initially
      await neuraBridgePage.isConnectWalletBtnVisible();

    } catch (error) {
      console.error(`❌ Error verifying page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Bridge page without connected wallet after network switch', async ({ neuraBridgePage, context }) => {
    try {
      // Step 1: Initialize bridge with options (no wallet connection, with network switch, no initial page layout verification)
      // This will automatically switch the network direction and verify the layout after switching
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false,
        switchNetworkDirection: true
      });

      // Step 2: Verify that the Enter Amount button is disabled initially
      await neuraBridgePage.isConnectWalletBtnVisible();

    } catch (error) {
      console.error(`❌ Error verifying page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Bridge page network switch modal', async ({ neuraBridgePage, context }) => {
    try {
      // Step 1: Initialize bridge with options (no wallet connection, with network switch, no initial page layout verification)
      // This will automatically switch the network direction and verify the layout after switching
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false
      });

      // Step 2: Verify that the Enter Amount button is disabled initially
      await neuraBridgePage.verifySourceChainModal(neuraBridgeAssertions.pageLayout.networks.holesky.at(0));
      await neuraBridgePage.switchNetworkDirection();
      await neuraBridgePage.verifySourceChainModal(neuraBridgeAssertions.pageLayout.networks.neuraTestnet.at(0));

    } catch (error) {
      console.error(`❌ Error verifying Source Chaim Modal page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Claim page layout', async ({ neuraBridgePage, context }) => {
    try {
      // Step 1: Initialize bridge with options (no wallet connection, with network switch, no initial page layout verification)
      // This will automatically switch the network direction and verify the layout after switching
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false
      });

      // Step 2: Verify that Neura Claim page layout
      await neuraBridgePage.openBurgerMenu();
      await neuraBridgePage.selectClaimFromBurgerMenu();
      await neuraBridgePage.assertClaimTokenPageLayout();

    } catch (error) {
      console.error(`❌ Error verifying Claim Page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify user connects to MetaMask wallet from widget Connect Wallet button', async ({ neuraBridgePage, context }) => {
    // Step 1: Initialize bridge with options (with wallet connection, no network switch, verify page layout)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true,
        useConnectWalletWidgetButton: true
      },
      switchNetworkDirection: false,
      verifyBridgePageLayout: true
    });
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Verify that the Enter Amount button is disabled initially
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    // Step 3: Fill amount and assert that the amount is entered correctly
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from widget Connect Wallet button and switch networks successfully', async ({ neuraBridgePage, context }) => {
    // Step 1: Initialize bridge with options (with wallet connection, no network switch, verify page layout)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true,
        useConnectWalletWidgetButton: true
      },
      switchNetworkDirection: true,
      verifyBridgePageLayout: false
    });
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Verify that the Enter Amount button is disabled initially
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    // Step 3: Fill amount and assert that the amount is entered correctly
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from top Connect Wallet button', async ({ neuraBridgePage, context }) => {
    // Step 1: Initialize bridge with options (with wallet connection, no network switch, verify page layout)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true,
        useConnectWalletWidgetButton: false
      },
      switchNetworkDirection: false,
      verifyBridgePageLayout: true
    });
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Verify that the Enter Amount button is disabled initially
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    // Step 3: Fill amount and assert that the amount is entered correctly
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from top Connect Wallet button and switch networks successfully', async ({ neuraBridgePage, context }) => {
    // Step 1: Initialize bridge with options (with wallet connection, no network switch, verify page layout)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true,
        useConnectWalletWidgetButton: false
      },
      switchNetworkDirection: true,
      verifyBridgePageLayout: false
    });
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Verify that the Enter Amount button is disabled initially
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    // Step 3: Fill amount and assert that the amount is entered correctly
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to and disconnects from MetaMask wallet', async ({ neuraBridgePage, context }) => {
    // Step 1: Initialize bridge with options (with wallet connection, no network switch, verify page layout)
    await neuraBridgePage.initializeBridgeWithOptions({
      context,
      walletConnection: {
        connect: true,
        useConnectWalletWidgetButton: true
      },
      switchNetworkDirection: false,
      verifyBridgePageLayout: false
    });
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();

    // Step 2: Disconnect wallet and assert that the Connect Wallet button is visible
    await neuraBridgePage.disconnectWallet();
    await neuraBridgePage.isConnectWalletBtnVisible();
  });
});
