import { expect } from '@playwright/test';
import { testWithoutSepolia as test } from '../test-utils/testFixtures.js';
import { TEST_AMOUNT } from '../constants/testConstants.js';
import { neuraBridgeAssertions } from '../constants/assertionConstants.js';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Neura Bridge page validation', () => {

  test('Verify Neura Bridge page without connected wallet', { tag: '@scheduledRun' }, async ({ neuraBridgePage, context }) => {
    try {
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: true
      });
      await neuraBridgePage.isConnectWalletBtnVisible();
    } catch (error) {
      console.error(`❌ Error verifying page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Bridge page without connected wallet after network switch', { tag: '@scheduledRun' }, async ({ neuraBridgePage, context }) => {
    try {
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false,
        switchNetworkDirection: true
      });
      await neuraBridgePage.isConnectWalletBtnVisible();
    } catch (error) {
      console.error(`❌ Error verifying page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Bridge page network switch modal', { tag: '@scheduledRun' }, async ({ neuraBridgePage, context }) => {
    try {
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false
      });
      await neuraBridgePage.verifySourceChainModal(neuraBridgeAssertions.pageLayout.networks.sepolia.at(0));
      await neuraBridgePage.switchNetworkDirection();
      await neuraBridgePage.verifySourceChainModal(neuraBridgeAssertions.pageLayout.networks.neuraTestnet.at(0));
    } catch (error) {
      console.error(`❌ Error verifying Source Chaim Modal page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify Neura Claim page layout', async ({ neuraBridgePage, context }) => {
    try {
      await neuraBridgePage.initializeBridgeWithOptions({
        context,
        switchNetworkDirection: false,
        walletConnection: {
          connect: false
        },
        verifyBridgePageLayout: false
      });
      await neuraBridgePage.assertClaimTokenPageLayout();
    } catch (error) {
      console.error(`❌ Error verifying Claim Page layout: ${error.message}`);
      throw error;
    }
  });

  test('Verify user connects to MetaMask wallet from widget Connect Wallet button', async ({ neuraBridgePage, context }) => {
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
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from widget Connect Wallet button and switch networks successfully', async ({ neuraBridgePage, context }) => {
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
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from top Connect Wallet button', async ({ neuraBridgePage, context }) => {
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
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);
    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to MetaMask wallet from top Connect Wallet button and switch networks successfully', async ({ neuraBridgePage, context }) => {
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

    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);

    const enteredAmount = await neuraBridgePage.fillAmount(TEST_AMOUNT);
    expect(enteredAmount).toBe(TEST_AMOUNT);
  });

  test('Verify user connects to and disconnects from MetaMask wallet', { tag: '@scheduledRun' }, async ({ neuraBridgePage, context }) => {
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
    await neuraBridgePage.disconnectWallet();
    await neuraBridgePage.isConnectWalletBtnVisible();
  });
});
