import { ethers } from 'ethers';
import BridgeDepositWatcher from '../scripts/BridgeDepositWatcher';
const { test, expect } = require('@playwright/test');
const WalletFactory = require('../factory/WalletFactory');
const NeuraBridgePage = require('../pages/NeuraBridgePage');
const networks = require('../constants/networkConstants');
const { neuraBridgeAssertions } = require('../constants/assertionConstants');
const { waitForAnyDepositInSubgraph } = require('../utils/subgraph');

require('dotenv').config();

test.describe('Neura Bridge UI Automation', () => {
  let wallet;
  let context;
  let neuraBridgePage;
  const walletType = 'metamask';

  const config = {
    seedPhrase: process.env.PRIVATE_KEY,
    password: process.env.WALLET_PASSWORD,
    dappUrl: process.env.DAPP_URL,
  };

  test.beforeEach(async () => {
    test.slow();
    if (!config.seedPhrase || !config.password) {
      throw new Error(
        'Missing required environment variables: PRIVATE_KEY and WALLET_PASSWORD must be set',
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

    // Set wallet for the DappExamplePage using the strategy pattern
    await neuraBridgePage.setWallet(wallet);

    // Start App and Connect Wallet to Neura Test Network
    const { extensionPage, previousPage } = await wallet.openExtension();
    await extensionPage.addAndSelectNetwork(networks.neuraTestnet);
    await extensionPage.closeExtension(previousPage);
  });

  test.afterEach(async ({}) => {
    await context.close();
  });

  test('Verify Neura Bridge Page Layout before wallet is connected', async () => {
    const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(pageLayout, neuraBridgeAssertions.pageLayout.networks.holesky, neuraBridgeAssertions.pageLayout.networks.neuraTestnet);
    await neuraBridgePage.switchBridgeNetwork();
    const newPageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(newPageLayout, neuraBridgeAssertions.pageLayout.networks.neuraTestnet, neuraBridgeAssertions.pageLayout.networks.holesky);
  });

  test('Verify Neura Bridge network switch is functional', async () => {
    const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(pageLayout, neuraBridgeAssertions.pageLayout.networks.holesky, neuraBridgeAssertions.pageLayout.networks.neuraTestnet);
    await neuraBridgePage.switchBridgeNetwork();
    const newPageLayout = await neuraBridgePage.retrieveBridgeLayoutDatta();
    await neuraBridgePage.assertNetworkLabels(newPageLayout, neuraBridgeAssertions.pageLayout.networks.neuraTestnet, neuraBridgeAssertions.pageLayout.networks.holesky);
  });

  test('Verify Neura Bridge Page Layout after MetaMask wallet is connected', async () => {
    await neuraBridgePage.connectMetaMaskWallet(context);
    await neuraBridgePage.verifyMetaMaskWalletScreenWithAssertions();
    const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(pageLayout, neuraBridgeAssertions.pageLayout.networks.holesky, neuraBridgeAssertions.pageLayout.networks.neuraTestnet);
    const enterAmountBtnIsDisabled = await neuraBridgePage.getEnterAmountBtnState();
    expect(enterAmountBtnIsDisabled).toBe(true);
    await neuraBridgePage.fillAmount('0.000001');
    await neuraBridgePage.switchBridgeNetwork();
    const newPageLayout = await neuraBridgePage.retrieveBridgeLayoutDatta();
    await neuraBridgePage.assertNetworkLabels(newPageLayout, neuraBridgeAssertions.pageLayout.networks.neuraTestnet, neuraBridgeAssertions.pageLayout.networks.holesky);
  });

  test('Verify Holesky to Neura Bridge', async () => {
    test.setTimeout(120_000); // ⏱️ set timeout to 2 minutes
    const from = process.env.MY_ADDRESS.toLowerCase();
    const uiAmount = '0.000001';
    const rawAmount = ethers.utils.parseUnits(uiAmount, 18); // BigNumber
    const amount = ethers.utils.parseUnits(uiAmount, 18).toString(); // "1000000000000"
    const watcher = new BridgeDepositWatcher();
    const balanceBefore = await watcher.getAnkrBalance();
    await neuraBridgePage.connectMetaMaskWallet(context);
    await neuraBridgePage.fillAmount(uiAmount);
    await neuraBridgePage.clickBridgeButton();
    await neuraBridgePage.approveTokenTransfer(context);
    const deposit = await waitForAnyDepositInSubgraph(from, amount);
    expect(deposit).toBeTruthy();
    const balanceAfter = await watcher.getAnkrBalance();
    console.log(`🧮 Balance before: ${balanceBefore}`);
    console.log(`🧮 Balance after:  ${balanceAfter}`);
    const before = ethers.utils.parseUnits(balanceBefore, 18);
    const after = ethers.utils.parseUnits(balanceAfter, 18);
    const diff = after.sub(before);
    console.log('💡 rawAmount:', rawAmount.toString());
    console.log('💡 diff     :', diff.toString());
    expect(diff.lte(ethers.constants.Zero)).toBe(true);
  });

  test('Verify Neura to Holesky Bridge', async () => {
    test.setTimeout(120_000);
    const uiAmount = '0.000001';
    const watcher = new BridgeDepositWatcher();

    // ✅ Step 1: Record balances before bridging
    const ankrBefore = await watcher.getAnkrBalance();
    const ethBefore = await watcher.getEthBalance();

    // ✅ Step 2: Perform UI bridge flow
    await neuraBridgePage.connectMetaMaskWallet(context);
    const pageLayout = await neuraBridgePage.assertAndVerifyPageLayout();
    await neuraBridgePage.assertNetworkLabels(
      pageLayout,
      neuraBridgeAssertions.pageLayout.networks.holesky,
      neuraBridgeAssertions.pageLayout.networks.neuraTestnet
    );
    await neuraBridgePage.switchBridgeNetwork();

    const newPageLayout = await neuraBridgePage.retrieveBridgeLayoutDatta();
    await neuraBridgePage.assertNetworkLabels(
      newPageLayout,
      neuraBridgeAssertions.pageLayout.networks.neuraTestnet,
      neuraBridgeAssertions.pageLayout.networks.holesky
    );

    await neuraBridgePage.fillAmount(uiAmount);
    await neuraBridgePage.clickBridgeButton();
    const previewTransactionLayout = await neuraBridgePage.assertPreviewTransactionLayout();
    await neuraBridgePage.verifyPreviewTransactionLabels(previewTransactionLayout);
    await neuraBridgePage.bridgeTokens(context);
    await neuraBridgePage.claimTokens();

    // ✅ Step 3: Record balances after bridge
    const ankrAfter = await watcher.getAnkrBalance();
    const ethAfter = await watcher.getEthBalance();

    console.log(`🪙 ANKR before: ${ankrBefore}`);
    console.log(`🪙 ANKR after : ${ankrAfter}`);
    console.log(`💰 ETH before : ${ethBefore}`);
    console.log(`💰 ETH after  : ${ethAfter}`);

    // ✅ Step 4: Parse balances as BigNumbers
    const ankrBeforeBN = ethers.utils.parseUnits(ankrBefore, 18);
    const ankrAfterBN = ethers.utils.parseUnits(ankrAfter, 18);
    const ethBeforeBN = ethers.utils.parseEther(ethBefore);
    const ethAfterBN = ethers.utils.parseEther(ethAfter);

    const ankrDiff = ankrAfterBN.sub(ankrBeforeBN);
    const ethDiff = ethAfterBN.sub(ethBeforeBN);

    console.log('💡 ANKR diff:', ankrDiff.toString());
    console.log('💡 ETH diff :', ethDiff.toString());

    // ✅ Step 5: Assert final balances
    expect(ankrAfterBN.eq(ankrBeforeBN)).toBe(true);
    expect(ethAfterBN.eq(ethBeforeBN)).toBe(true);
  });
});