import BridgeDepositWatcher from '../scripts/BridgeDepositWatcher';

const BasePage = require('./BasePage');
const selectors = require('../locators/neuraLocators');
const { neuraBridgeAssertions } = require('../constants/assertionConstants');
const ethersUtil = require('../utils/ethersUtil');
const assertionHelpers = require('./AssertionHelpers');
const { ethers } = require('ethers');

class NeuraBridgePage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.selectors = selectors;
    this.wallet = null;
  }

  /**
   * Static method to create a new NeuraBridgePage instance and navigate to the dApp URL
   * @param {context} context - The browser context
   * @param {string} bridgePageUrl - URL of the dApp
   * @returns {Promise<NeuraBridgePage>} - Returns a new NeuraBridgePage instance
   */
  static async initialize(context, bridgePageUrl) {
    // Open the Bridge page
    const page = await context.newPage();
    await page.goto(bridgePageUrl);

    // Create the page object
    const bridgePage = new NeuraBridgePage(page);

    // Clean up unnecessary pages
    await bridgePage.closeUnnecessaryPages(context);

    return bridgePage;
  }

  /**
   * Close any unnecessary pages to keep the browser clean
   * @param {context} context - The browser context
   * @returns {Promise<void>}
   */
  async closeUnnecessaryPages(context) {
    // Get a list of all pages in the context
    const allPages = context.pages();

    // Filter out the current page (this.page)
    const pagesToClose = allPages.filter(page => page !== this.page);

    if (pagesToClose.length > 0) {
      console.log(`Found ${pagesToClose.length} unnecessary pages to close:`);

      // Log information about each page being closed
      for (const page of pagesToClose) {
        try {
          const url = page.url();
          console.log(`- Closing page with URL: ${url}`);
          await page.close();
        } catch (error) {
          console.error(`Failed to close page: ${error.message}`);
        }
      }

      console.log('Page cleanup complete');
    } else {
      console.log('No unnecessary pages to close');
    }
  }

  /**
   * Set the wallet type to use for connections
   * @param wallet - The wallet instance
   */
  setWallet(wallet) {
    this.wallet = wallet;
  }

  async attachWallet(context) {
    // Wait for the extension prompt modal to open
    const [extensionPopup] = await Promise.all([context.waitForEvent('page')]);
    await extensionPopup.waitForLoadState('domcontentloaded');

    // Bring the extension prompt modal to the front
    await extensionPopup.bringToFront();

    const popupWallet = new this.wallet.constructor(extensionPopup);
    await popupWallet.connectWallet();

    // Signing user message for authentication
    await new Promise(r => setTimeout(r, 1000));
    await this.click(this.selectors.connection.signMessage);
    await this.confirmTransaction(context);
    // Return to the dapp page
    await this.page.bringToFront();
  }

  async confirmTransaction(context) {

    // Wait for the extension prompt modal to open
    const [extensionPopup] = await Promise.all([context.waitForEvent('page')]);

    // Bring the extension prompt modal to the front
    await extensionPopup.bringToFront();

    const popupWallet = new this.wallet.constructor(extensionPopup);
    await popupWallet.confirmTransaction();
  }

  /**
   * Confirm MetaMask transaction with flexible tab detection
   * @param {BrowserContext} context - Playwright browser context
   * @param {string[]} urlMatchers - URL fragments to identify the correct MetaMask tab
   */
  async confirmTransactionWithExplicitPageSearch(context, urlMatchers = ['notification.html', 'metamask']) {
    let extensionPopup;

    try {
      [extensionPopup] = await Promise.all([
        context.waitForEvent('page', {timeout: 1000}),
        this.page.waitForTimeout(200),
      ]);
      console.log('✅ MetaMask popup opened as new tab');
    } catch {
      console.log('🔍 Looking for MetaMask popup opened as new tab');
      extensionPopup = await this.findAndFocusMatchingPage(context, urlMatchers);

      if (!extensionPopup) throw new Error('❌ Could not detect MetaMask popup');
      console.log('✅ Found already open MetaMask tab');
    }

    const popupWallet = new this.wallet.constructor(extensionPopup);
    await popupWallet.confirmTransaction();
  }

  /**
   * Search through open tabs and bring matching page to front
   * @param {BrowserContext} context - Playwright browser context
   * @param {string[]} urlMatchers - Array of substrings to match in tab URL
   * @returns {Promise<Page|null>} - The matching page or null if not found
   */
  async findAndFocusMatchingPage(context, urlMatchers = []) {
    const matchingPage = context.pages().find(p => {
      try {
        const url = p.url();
        return urlMatchers.some(matcher => url.includes(matcher));
      } catch {
        return false;
      }
    });

    if (!matchingPage) return null;

    await matchingPage.bringToFront();
    return matchingPage;
  }

  async handleMetaMaskTab(tab) {
    await tab.bringToFront();
    await tab.waitForLoadState('domcontentloaded');
    const popupWallet = new this.wallet.constructor(tab);
    await popupWallet.sendSubmission();
  }

  async detectMetaMaskTabWithFallback(timeout = 2000) {
    return (
        (await this.waitForMetaMaskTab(timeout)) ||
        (await this.findExistingMetaMaskTab()) ||
        (() => {
          throw new Error('❌ MetaMask tab could not be detected');
        })()
    );
  }

  async findExistingMetaMaskTab() {
    const context = this.page.context();
    const pages = context.pages();

    // Process all pages in parallel using Promise.all
    const pageChecks = await Promise.all(
      pages.map(async (page) => {
        try {
          const url = page.url();
          // Use a single regex check instead of multiple includes
          if (/notification\.html|metamask/i.test(url)) {
            return { found: true, page, url };
          }
        } catch (_) {
          // Silently ignore errors accessing page URLs
        }
        return { found: false };
      })
    );

    // Find the first matching page
    const foundPage = pageChecks.find(result => result.found);

    if (foundPage?.page) {
      console.log('✅ Found existing MetaMask tab:', foundPage.url);
      return foundPage.page;
    }

    console.warn('❌ No MetaMask tab found among existing pages');
    return null;
  }

  async waitForMetaMaskTab(timeout = 2000) {
    const context = this.page.context();

    try {
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout }),
        this.page.waitForTimeout(500), // or your click that triggers MetaMask
      ]);

      await newPage.waitForLoadState('domcontentloaded');

      const url = newPage.url();
      if (url.includes('notification.html') || url.includes('metamask')) {
        console.log('✅ MetaMask tab detected via waitForEvent:', url);
        return newPage;
      } else {
        console.warn('⚠️ New tab is not MetaMask:', url);
      }
    } catch {
      console.log('⏱️ No new MetaMask tab appeared within timeout');
    }

    return null; // fall back if needed
  }

  async approveCustomChainNetworkTransaction() {
    const metamaskTab = await this.findExistingMetaMaskTab();
    if (!metamaskTab) throw new Error('MetaMask tab not found');
    await this.handleMetaMaskTab(metamaskTab);
  }

  /**
   * Retrieves the bridge layout data from the UI
   * @returns {Promise<Object>} - Returns an object containing the bridge layout data
   */
  async retrieveBridgeLayoutData() {
    const bridgeTitle = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.neuraBridgeTitleLabel);
    const networks = await this.getAllRowTexts(this.selectors.bridgeDescriptors.bridgeLabels, this.selectors.general.cellCss);

    const toLabel      = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.toLabel);
    const fromLabel    = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.fromLabel);
    const amountLabel  = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.amountLabel);
    const limitLabel  = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.limitLabel);

    // links – leverage the new role-aware visibility check
    const claimVisible      = await this.isRoleVisible(this.selectors.roles.link, this.selectors.bridgeDescriptors.claimLink.link);
    const faucetVisible     = await this.isRoleVisible(this.selectors.roles.link, this.selectors.bridgeDescriptors.faucetLink.link);
    const howItWorksVisible = await this.isRoleVisible(this.selectors.roles.link, this.selectors.bridgeDescriptors.howItWorks.link);

    return {
      title:  bridgeTitle,
      networks: networks,
      labels: { toLabel, fromLabel, amountLabel, limitLabel },
      links:  { claimVisible, faucetVisible, howItWorksVisible },
    };
  }

  /**
   * Assert page layout and verify it against expected values
   * @returns {Promise<Object>} - Returns the page layout object after verification
   */
  async assertBridgeWidgetLayout() {
    const pageLayout = await this.retrieveBridgeLayoutData();
    assertionHelpers.validateBridgePageLayout(pageLayout);
    assertionHelpers.assertNetworkLabels(
        pageLayout,
        neuraBridgeAssertions.pageLayout.networks.holesky,
        neuraBridgeAssertions.pageLayout.networks.neuraTestnet
    );
    return pageLayout;
  }

  async getEnterAmountBtnState() {
    return await this.isDisabledByDescLoc(this.selectors.bridgeDescriptors.enterAmountBtnLabel);
  }

  async isConnectWalletBtnVisible() {
    return await this.isRoleVisible(this.selectors.connection.connectWalletButton);
  }

  async assertClaimTokenPageLayout() {
    const title = await this.getTextByDescLoc(this.selectors.claimTokensDescriptors.title);
    const subTitle = await this.getTextByDescLoc(this.selectors.claimTokensDescriptors.subTitle);
    const tableLabels = await this.getAllRowTexts(this.selectors.claimTokensDescriptors.tableLabel, this.selectors.general.cellCss);

    return {
      title:  title,
      subTitle: subTitle,
      tableLabels: tableLabels
    };
  }

  /**
   * Asserts the preview transaction layout and optionally checks for the approve token transfer button
   * @param {boolean} checkApproveButton - Whether to check for the approve token transfer button
   * @returns {Promise<Object>} - The preview transaction layout
   */
  async assertPreviewTransactionLayout(checkApproveButton = false) {
    const title = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.previewTransactionLabel);
    const previewLabels = await this.getText(this.selectors.bridgeDescriptors.previewDataTableLabels);
    const previewValues = await this.getText(this.selectors.bridgeDescriptors.previewDataTableValues);

    const layout = {
      title: title,
      previewLabels: previewLabels,
      previewValues: previewValues
    };

    if (checkApproveButton) {
      layout.operationButton = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.approveTokenTransferButton);
    } else {
      layout.operationButton = await this.getTextByDescLoc(this.selectors.bridgeDescriptors.bridgeTokensBtn);
    }

    return layout;
  }

  /**
   * Connect to the Neura dApp using the configured wallet
   * @param {Object} context - The browser context
   * @param {boolean} [useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>} - Resolves when the connection is complete
   */
  async connectMetaMaskWallet(context, useConnectWalletWidgetButton = false) {
    const enterAmountBtnIsHidden = await this.isRoleVisible(this.selectors.roles.text, this.selectors.bridgeDescriptors.enterAmountBtnLabel.text);
    assertionHelpers.assertEnterAmountButtonNotVisible(enterAmountBtnIsHidden);
    await this.wireMetaMask(context, useConnectWalletWidgetButton);
  }

  async fillAmount(amount) {
    await new Promise(r => setTimeout(r, 3000));
    await this.fillDescLoc(this.selectors.walletScreen.amountField, amount);
    return await this.getElementWithDescLoc(this.selectors.walletScreen.amountField).inputValue();
  }

  /**
   * Connect to the Neura dApp using the configured wallet
   * @param {Object} context - The browser context
   * @param {boolean} [useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>} - Resolves when the connection is complete
   */
  async wireMetaMask(context, useConnectWalletWidgetButton = false) {
    if (useConnectWalletWidgetButton) {
      await this.clickDescLoc(this.selectors.bridgeDescriptors.connectWallet);
    } else {
      await this.clickDescLoc(this.selectors.connection.connectWalletButton);
    }
    await this.click(this.selectors.connection.selectMetaMaskWallet);
    await this.attachWallet(context);
    await new Promise(r => setTimeout(r, 1500));
  }

  async bridgeTokensFromChainToNeura(context) {
    await this.approveTokenTransfer(context);
    await this.approveBridgingTokens(context);
  }

  async bridgeTokensFromNeuraToChain(context) {
      await this.clickDescLoc(this.selectors.bridgeDescriptors.bridgeTokensBtn);
      await this.approveBridgingTokens(context);
  }

  /**
   * Clicks the bridge button and asserts the preview transaction layout
   * @param {boolean} checkApproveButton - Whether to check for the approve token transfer button
   * @returns {Promise<Object>} - The preview transaction layout
   */
  async clickBridgeButton(context, checkApproveButton = false) {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.bridgeBtn);
    await new Promise(r => setTimeout(r, 3000));
    // await this.approveCustomChainNetworkTransaction();
    await this.confirmTransactionWithExplicitPageSearch(context);
    return await this.assertPreviewTransactionLayout(checkApproveButton);
  }

  async approveTokenTransfer(context) {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.approveTokenTransferButton);
    await this.confirmTransaction(context);
    await this.waitForDescLocElementToDisappear({ text: 'Approving token transfer...' }, { timeout: 60000, longTimeout: 60000 });
  }

  async approveBridgingTokens(context) {
    await this.confirmTransaction(context);
    await this.waitForDescLocElementToDisappear({ text: 'Bridging tokens...' }, { timeout: 45000, longTimeout: 45000 });
  }

  async claimTokens() {
    await new Promise(r => setTimeout(r, 30000));
    await this.clickDescLoc(this.selectors.bridgeDescriptors.claimTokensBtn);
  }

  async claimTransaction(context) {
    await new Promise(r => setTimeout(r, 5000));
    await this.clickDescLoc(this.selectors.bridgeDescriptors.claimTransactionButton);
    await this.confirmTransaction(context);
    await this.waitForDescLocElementToDisappear({ text: 'Claiming 0.1 ANKR. Please don\'t close the page\n' }, { timeout: 30000, longTimeout: 30000 });
  }

  async navigateToFaucetPage() {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.faucetBtn);
  }

  async navigateToClaimPage() {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.claimBtn);
  }

  /**
   * Gets the transaction hash from the UI after a transaction is submitted
   * @returns {Promise<string>} - The transaction hash
   */
  async getTransactionHash() {
    // Wait for the transaction hash to appear in the UI
    await this.page.waitForSelector(this.selectors.bridgeDescriptors.transactionHash, { timeout: 30000 });
    return await this.getTextByDescLoc(this.selectors.bridgeDescriptors.transactionHash);
  }

  /**
   * Verifies a transaction on the blockchain using ethers.js
   * @param {string} txHash - The transaction hash
   * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
   * @returns {Promise<boolean>} - True if the transaction was successful, false otherwise
   */
  async verifyTransactionOnChain(txHash, networkName) {
    console.log(`Verifying transaction ${txHash} on ${networkName}...`);
    return await ethersUtil.verifyTransaction(txHash, networkName);
  }

  /**
   * Verifies a bridge transaction by checking the balance on the destination chain
   * @param {string} address - The wallet address
   * @param {string} sourceNetwork - The name of the source network (e.g., 'neuraTestnet', 'holesky')
   * @param {string} destinationNetwork - The name of the destination network (e.g., 'neuraTestnet', 'holesky')
   * @param {string} amount - The amount that was bridged (in ETH)
   * @param {number} timeoutMs - The timeout in milliseconds (default: 60000 - 1 minute)
   * @returns {Promise<boolean>} - True if the bridge was successful, false otherwise
   */
  async verifyBridgeTransaction(address, sourceNetwork, destinationNetwork, amount, timeoutMs = 60000) {
    console.log(`Verifying bridge transaction from ${sourceNetwork} to ${destinationNetwork} for address ${address}...`);
    const amountInWei = ethersUtil.ethers.parseEther(amount);
    return await ethersUtil.verifyBridgeTransaction(address, sourceNetwork, destinationNetwork, amountInWei, timeoutMs);
  }

  /**
   * Gets the wallet address from MetaMask
   * @returns {Promise<string>} - The wallet address
   */
  async getWalletAddress() {
    if (!this.wallet) {
      throw new Error('Wallet not set. Call setWallet() first.');
    }
    return await this.wallet.getAddress();
  }

  /**
   * Verifies the MetaMask wallet screen and returns the layout information
   * @returns {Promise<Object>} - Returns an object containing wallet screen layout information
   */
  async verifyMetaMaskWalletScreen() {
    await this.clickDescLoc(this.selectors.connection.avatarButton);
    await new Promise(r => setTimeout(r, 5000));
    const neuraWalletLabels = await this.getAllTextsInit(this.selectors.walletScreen.neuraLabels);
    const testNetLabels = await this.getAllRowTexts(this.selectors.walletScreen.testNetLabels, this.selectors.general.cellCss);
    const activityLabel = await this.getAllTextsInit(this.selectors.walletScreen.activityLabel);
    return {
      neuraWalletLabels: neuraWalletLabels,
      networkLabels: testNetLabels,
      activityLabel: activityLabel
    };
  }

  /**
   * Verify MetaMask wallet screen against expected values
   * @returns {Promise<Object>} - Returns the wallet screen layout information
   */
  async verifyMetaMaskWalletScreenWithAssertions() {
    const metaMaskScreenLayout = await this.verifyMetaMaskWalletScreen();
    await assertionHelpers.assertMetaMaskWalletScreen(metaMaskScreenLayout);
    await this.clickDescLoc(this.selectors.walletScreen.expandWallet);
    await new Promise(r => setTimeout(r, 1500));
    return metaMaskScreenLayout;
  }


  /**
   * Switch the network direction and verify the new layout
   *
   * @returns {Promise<Object>} - The new page layout after switching
   */
  async switchNetworkAndVerify() {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.switchBridgeBtn);
    const newPageLayout = await this.retrieveBridgeLayoutData();
    assertionHelpers.validateBridgePageLayout(newPageLayout);
    assertionHelpers.assertNetworkLabels(
      newPageLayout,
      neuraBridgeAssertions.pageLayout.networks.neuraTestnet,
      neuraBridgeAssertions.pageLayout.networks.holesky
    );
    return newPageLayout;
  }

  /**
   * Initialize the bridge with options
   *
   * @param {Object} options - Configuration options
   * @param {Object} options.context - The browser context (required)
   * @param {Object} [options.walletConnection] - Wallet connection options
   * @param {boolean} [options.walletConnection.connect=false] - Whether to connect the wallet
   * @param {boolean} [options.walletConnection.useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @param {boolean} [options.switchNetworkDirection=false] - Whether to switch the network direction
   * @param {boolean} [options.verifyBridgePageLayout=false] - Whether to verify the page layout
   * @returns {Promise<Object>} - The page layout after setup
   */
  async initializeBridgeWithOptions(options) {
    const {
      context,
      walletConnection = {},
      switchNetworkDirection = false,
      verifyBridgePageLayout = false
    } = options;

    // Extract wallet connection options with defaults
    const {
      connect: connectWallet = false,
      useConnectWalletWidgetButton = false
    } = walletConnection;

    if (!context) {
      throw new Error('Context is required for bridge initialization');
    }

    let pageLayout;

    // Connect wallet if requested
    if (connectWallet) {
      await this.connectMetaMaskWallet(context, useConnectWalletWidgetButton);
    }

    // Verify the initial layout if requested
    if (verifyBridgePageLayout) {
      pageLayout = await this.assertBridgeWidgetLayout();
    }

    // Switch network direction if requested
    if (switchNetworkDirection) {
      return await this.switchNetworkAndVerify();
    }

    return pageLayout;
  }

  /**
   * Performs the Holesky to Neura operation:
   * 1. Fills amount
   * 2. Initiates bridge transaction
   * 3. Verifies preview transaction screen
   * 4. Depending on the approvalStepOnly flag:
   *    - If true: only approves token transfer (first step of the bridging process)
   *    - If false: completes the full bridging process (approves token transfer AND bridges tokens)
   *
   * @param {Object} context - The browser context
   * @param {string} amount - The amount to bridge
   * @param {boolean} approvalStepOnly - Controls whether to perform only token approval (true) or complete the full bridging process (false)
   * @returns {Promise<void>}
   */
  async performHoleskyToNeuraOperation(context, amount, approvalStepOnly = false) {
    await this.fillAmount(amount);
    const previewTransactionLayout = await this.clickBridgeButton(context, true);
    assertionHelpers.assertPreviewTransactionLabels(previewTransactionLayout);
    if (approvalStepOnly) {
      await this.approveTokenTransfer(context);
    } else {
      await this.bridgeTokensFromChainToNeura(context);
    }
  }

  async closeBridgeModal() {
    await this.clickDescLoc(this.selectors.bridgeDescriptors.closeBridgeModal);
  }

  /**
   * Performs the complete Neura to Holesky bridge operation:
   * 1. Fills amount
   * 2. Initiates bridge transaction
   * 3. Verifies preview transaction screen
   * 4. Approves bridging tokens
   * 5. Claims tokens
   *
   * @param {Object} context - The browser context
   * @param {string} amount - The amount to bridge
   * @returns {Promise<void>}
   */
  async performNeuraToHoleskyBridge(context, amount) {
    await this.fillAmount(amount);
    const previewTransactionLayout = await this.clickBridgeButton(false);
    assertionHelpers.assertPreviewTransactionLabels(previewTransactionLayout);
    await this.bridgeTokensFromNeuraToChain(context);
    await this.claimTokens();
  }

  /**
   * Records and compares balances before and after a bridge operation
   *
   * @param {Function} operation - The bridge operation to perform
   * @returns {Promise<Object>} - The balance differences
   */
  async recordAndCompareBalances(operation) {
    const watcher = new BridgeDepositWatcher();

    // Record balances before bridging
    const ankrBefore = await watcher.getAnkrBalance();
    const ethBefore = await watcher.getEthBalance();

    // Perform the bridge operation
    await operation();

    // Record balances after bridge
    const ankrAfter = await watcher.getAnkrBalance();
    const ethAfter = await watcher.getEthBalance();

    console.log(`🪙 ANKR before: ${ankrBefore}`);
    console.log(`🪙 ANKR after : ${ankrAfter}`);
    console.log(`💰 ETH before : ${ethBefore}`);
    console.log(`💰 ETH after  : ${ethAfter}`);

    // Parse balances as BigNumbers and calculate differences
    const ankrBeforeBN = ethers.utils.parseUnits(ankrBefore, 18);
    const ankrAfterBN = ethers.utils.parseUnits(ankrAfter, 18);
    const ethBeforeBN = ethers.utils.parseEther(ethBefore);
    const ethAfterBN = ethers.utils.parseEther(ethAfter);

    const ankrDiff = ankrAfterBN.sub(ankrBeforeBN);
    const ethDiff = ethAfterBN.sub(ethBeforeBN);

    console.log('💡 ANKR diff:', ankrDiff.toString());
    console.log('💡 ETH diff :', ethDiff.toString());

    return {
      ankrBeforeBN,
      ankrAfterBN,
      ethBeforeBN,
      ethAfterBN,
      ankrDiff,
      ethDiff
    };
  }
}

module.exports = NeuraBridgePage;
