import {expect} from '@playwright/test';
import BasePage from './common/BasePage.js';
import selectors from '../locators/neuraLocators.js';
import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';
import ethersUtil from '../utils/ethersUtil.js';
import {formatBalanceString} from '../utils/util.js';
import {TransactionAction} from '../constants/testConstants.js';
import {neuraBridgeAssertions} from '../constants/assertionConstants.js';
import * as timeouts from '../constants/timeoutConstants.js';
import * as assertionHelpers from '../utils/AssertionHelpers.js';

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
    const page = await context.newPage();
    await page.goto(bridgePageUrl);
    const bridgePage = new NeuraBridgePage(page);
    await bridgePage.closeUnnecessaryPages(context);
    return bridgePage;
  }

  async disconnectWallet() {
    await this.play.clickDescLoc(this.selectors.connection.settingsButton);
    await this.play.click(this.selectors.connection.disconnectWallet);
  }

  async claimLatestTransaction(context, amount) {
    await new Promise(r => setTimeout(r, timeouts.TRANSACTION_APPROVAL_TIMEOUT));
    await this.assertClaimTokenPageLayout();
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.refreshClaimTransactionButton);
    await this.claimTransaction(context, amount);
  }

  async openBurgerMenu() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.burgerMenuButton);
  }

  async selectBridgeFromBurgerMenu() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.bridgeButtonInBurgerMenu);
  }

  async selectFaucetFromBurgerMenu() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.faucetButtonInBurgerMenu);
  }

  async verifySourceChainModal(activeChain) {
    await this.play.clickDescLoc(this.selectors.sourceChainModal.openNetworkSourceMenu);
    await this.assertSourceChainModalLayout(activeChain);
    await this.play.clickDescLoc(this.selectors.sourceChainModal.closeChainModal);
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
    console.log('Waiting for MetaMask to load');
    const [extensionPopup] = await Promise.all([context.waitForEvent('page')]);
    await extensionPopup.waitForLoadState('domcontentloaded');
    await extensionPopup.bringToFront();

    const popupWallet = new this.wallet.constructor(extensionPopup);
    console.log('Connecting MetaMask wallet');
    await popupWallet.connectWallet();

    await new Promise(r => setTimeout(r, timeouts.METAMASK_POPUP_TIMEOUT / 2));
    console.log('Signing message for authentication');

    await this.play.click(this.selectors.connection.signMessage);
    console.log('Confirming MetaMask transaction after signing authentication message');
    await this.confirmTransaction(context);
    console.log('MetaMask wallet connected and authenticated successfully');
    await this.page.bringToFront();
  }

  /**
   * Handle transaction popup for both confirm and cancel operations
   * @param {BrowserContext} context - Playwright browser context
   * @param {TransactionAction} action - Action to perform (TransactionAction.CONFIRM or TransactionAction.CANCEL)
   * @returns {Promise<void>}
   */
  async handleTransactionPopup(context, action) {
    const [extensionPopup] = await Promise.all([context.waitForEvent('page')]);
    await extensionPopup.bringToFront();

    const popupWallet = new this.wallet.constructor(extensionPopup);

    if (action === TransactionAction.CONFIRM) {
      await popupWallet.confirmTransaction();
    } else if (action === TransactionAction.CANCEL) {
      await popupWallet.cancelTransaction();
    } else if (action === TransactionAction.CONFIRM_CHAIN) {
      await popupWallet.approveSepoliaChainRequest();
    }
    else {
      throw new Error(`Invalid transaction action: ${action}`);
    }
  }

  /**
   * Confirm a transaction in the extension popup
   * @param {BrowserContext} context - Playwright browser context
   * @returns {Promise<void>}
   */
  async confirmTransaction(context) {
    await this.handleTransactionPopup(context, TransactionAction.CONFIRM);
  }

  /**
   * Cancel a transaction in the extension popup
   * @param {BrowserContext} context - Playwright browser context
   * @returns {Promise<void>}
   */
  async cancelTransaction(context) {
    await this.handleTransactionPopup(context, TransactionAction.CANCEL);
  }

  /**
   * Confirm MetaMask transaction with flexible tab detection
   * @param {Object} context - Playwright browser context
   * @param {string[]} urlMatchers - URL fragments to identify the correct MetaMask tab
   */
  async confirmTransactionWithExplicitPageSearch(context, urlMatchers = ['notification.html', 'metamask']) {
    let extensionPopup;

    try {
      [extensionPopup] = await Promise.all([
        context.waitForEvent('page', { timeout: timeouts.DEFAULT_TIMEOUT }),
        this.page.waitForTimeout(timeouts.DEFAULT_TIMEOUT / 2), // Short timeout for waiting
      ]);
      console.log('✅ MetaMask popup opened as new tab');
    } catch (error) {
      console.log('🔍 Looking for MetaMask popup opened as new tab');
      extensionPopup = await this.findAndFocusMatchingPage(context, urlMatchers);

      if (!extensionPopup) {
        console.error('Failed to find MetaMask popup:', error.message);
        throw new Error('❌ Could not detect MetaMask popup');
      }
      console.log('✅ Found already open MetaMask tab');
    }

    try {
      const popupWallet = new this.wallet.constructor(extensionPopup);
      await popupWallet.approveSepoliaChainRequest();
      await new Promise(r => setTimeout(r, timeouts.NETWORK_OPERATION_TIMEOUT));
    } catch (error) {
      console.error('Error approving custom network:', error.message);
      throw error;
    }
  }

  /**
   * Search through open tabs and bring matching page to front
   * @param {BrowserContext} context - Playwright browser context
   * @param {string[]} urlMatchers - Array of substrings to match in tab URL
   * @returns {Promise<Page|null>} - The matching page or null if not found
   */
  async findAndFocusMatchingPage(context, urlMatchers = []) {
    try {
      if (!context) {
        console.error('No context provided to findAndFocusMatchingPage');
        return null;
      }

      if (!urlMatchers || urlMatchers.length === 0) {
        console.warn('No URL matchers provided to findAndFocusMatchingPage');
        return null;
      }

      const pages = context.pages();
      if (!pages || pages.length === 0) {
        console.warn('No pages found in context');
        return null;
      }

      console.log(`Searching for page matching [${urlMatchers.join(', ')}] among ${pages.length} pages`);

      const matchingPage = pages.find(p => {
        try {
          const url = p.url();
          const matches = urlMatchers.some(matcher => url.includes(matcher));
          if (matches) {
            console.log(`Found matching page with URL: ${url}`);
          }
          return matches;
        } catch (error) {
          console.warn(`Error accessing URL for page:`, error.message);
          return false;
        }
      });

      if (!matchingPage) {
        console.warn(`No page found matching any of: [${urlMatchers.join(', ')}]`);
        return null;
      }

      console.log('Bringing matching page to front');
      await matchingPage.bringToFront();
      return matchingPage;
    } catch (error) {
      console.error('Error in findAndFocusMatchingPage:', error.message);
      return null;
    }
  }

  /**
   * Handle MetaMask tab for network approval
   * @param {Page} tab - The MetaMask tab to handle
   * @returns {Promise<void>}
   * @throws {Error} If tab cannot be handled properly
   */
  async handleMetaMaskTab(tab) {
    try {
      if (!tab) {
        throw new Error('Invalid tab provided to handleMetaMaskTab');
      }

      console.log('Bringing MetaMask tab to front');
      await tab.bringToFront();

      console.log('Waiting for MetaMask tab to load');
      await tab.waitForLoadState('domcontentloaded');

      console.log('Creating wallet instance for MetaMask tab');
      const popupWallet = new this.wallet.constructor(tab);

      console.log('Approving custom network in MetaMask');
      await popupWallet.approveCustomNetwork();
      console.log('Successfully approved custom network');
    } catch (error) {
      console.error('Error handling MetaMask tab:', error.message);
      throw new Error(`Failed to handle MetaMask tab: ${error.message}`);
    }
  }

  async confirmTransactionInMetaMask(context, action = 'confirmTransaction', timeout = timeouts.METAMASK_POPUP_TIMEOUT) {
    try {
      console.log(`Looking for MetaMask tab to perform action: ${action}`);

      // Logic from detectMetaMaskTabWithFallback - try multiple methods to find the tab
      let tab = await this.waitForMetaMaskTab(timeout);
      if (!tab) {
        tab = await this.findExistingMetaMaskTab(context);
      }
      if (!tab) {
        throw new Error('❌ MetaMask tab could not be detected');
      }

      console.log('Bringing MetaMask tab to front');
      await tab.bringToFront();

      console.log('Waiting for MetaMask tab to load');
      await tab.waitForLoadState('domcontentloaded');

      console.log('Creating wallet instance for MetaMask tab');
      const popupWallet = new this.wallet.constructor(tab);

      console.log(`Performing action: ${action} in MetaMask`);

      // Perform the specified action
      switch (action) {
        case 'confirmTransaction':
          await popupWallet.confirmTransaction();
          break;
        case 'approveSepoliaChainRequest':
          await popupWallet.approveSepoliaChainRequest();
          break;
        default:
          throw new Error(`Unknown action: ${action}. Supported actions: 'confirmTransaction', 'approveSepoliaChainRequest'`);
      }

      console.log(`Successfully performed action: ${action}`);
    } catch (error) {
      console.error(`Error performing action ${action} in MetaMask:`, error.message);
      throw new Error(`Failed to perform action ${action} in MetaMask: ${error.message}`);
    }
  }

  /**
   * Find an existing MetaMask tab among all open pages
   * @param {BrowserContext} [context] - The browser context to search in. If not provided, uses this.page.context()
   * @returns {Promise<Page|null>} - The MetaMask page if found, null otherwise
   */
  async findExistingMetaMaskTab(context = null) {
    try {
      const browserContext = context || this.page.context();
      const pages = browserContext.pages();

      if (!pages || pages.length === 0) {
        console.warn('No pages found in context');
        return null;
      }

      console.log(`Searching for MetaMask tab among ${pages.length} open pages`);

      // Process all pages in parallel using Promise.all
      const pageChecks = await Promise.all(
        pages.map(async (page, index) => {
          try {
            const url = page.url();
            // Use a single regex check instead of multiple includes
            if (/notification\.html|metamask/i.test(url)) {
              console.log(`Found MetaMask tab at index ${index} with URL: ${url}`);
              return { found: true, page, url };
            }
          } catch (error) {
            console.warn(`Error accessing URL for page at index ${index}:`, error.message);
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
    } catch (error) {
      console.error('Error finding MetaMask tab:', error.message);
    }

    return null;
  }

  async waitForMetaMaskTab(timeout = timeouts.METAMASK_POPUP_TIMEOUT) {
    const context = this.page.context();

    try {
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout }),
        this.page.waitForTimeout(timeouts.METAMASK_POPUP_TIMEOUT / 2), // or your click that triggers MetaMask
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

  /**
   * Approves a custom chain network transaction by finding and handling the MetaMask tab
   * @returns {Promise<void>}
   * @throws {Error} If MetaMask tab cannot be found or handled
   */
  async approveCustomChainNetworkTransaction() {
    try {
      console.log('Looking for MetaMask tab to approve custom chain network transaction');
      const metamaskTab = await this.findExistingMetaMaskTab();

      if (!metamaskTab) {
        console.error('Failed to find MetaMask tab for custom chain approval');
        throw new Error('MetaMask tab not found for custom chain approval');
      }

      console.log('Found MetaMask tab, handling approval process');
      await this.handleMetaMaskTab(metamaskTab);
      console.log('Successfully approved custom chain network transaction');
    } catch (error) {
      console.error('Error approving custom chain network transaction:', error.message);
      throw error;
    }
  }

  /**
   * Asserts that all bridge widget labels are visible
   * @returns {Promise<void>}
   */
  async assertBridgeWidgetLabels() {
    await expect(this.play.isElementVisibleDesc(this.selectors.bridgeDescriptors.bridgeLabel)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.bridgeDescriptors.fromLabel)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.bridgeDescriptors.toLabel)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.bridgeDescriptors.amountLabel)).resolves.toBe(true);
    await expect(this.play.isElementVisibleDesc(this.selectors.bridgeDescriptors.limitLabel)).resolves.toBe(true);
  }

  async assertSourceChainModalLayout(activeChain) {
    const title = await this.play.getElementWithDescLoc(this.selectors.sourceChainModal.selectSourceChainTitle).isVisible();
    expect(title).toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.sourceChainModal.neuraLabel)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.sourceChainModal.sepoliaLabel)).resolves.toBe(true);
    const activeSelectedChain = this.play.getElementWithDescLoc(this.selectors.sourceChainModal.activeChain);
    assertionHelpers.assertSelectedChain(activeSelectedChain, activeChain);
  }

  /**
   * Assert page layout and verify it against expected values
   * @returns {Promise<void>}
   */
  async assertBridgeWidgetLayout() {
    await this.assertBridgeWidgetLabels();
    const networks = await this.play.getAllRowTexts(this.selectors.bridgeDescriptors.bridgeLabels, this.selectors.general.cellCss);
    assertionHelpers.assertNetworkLabels(
      networks,
      neuraBridgeAssertions.pageLayout.networks.sepolia,
      neuraBridgeAssertions.pageLayout.networks.neuraTestnet
    );
  }

  async getEnterAmountBtnState() {
    return await this.play.isDisabledByDescLoc(this.selectors.bridgeDescriptors.enterAmountBtnLabel);
  }

  async isConnectWalletBtnVisible() {
    return await this.play.isElementHidden(this.selectors.connection.connectWalletButton.name);
  }

  async assertClaimTokenPageLayout() {
    const title = await this.play.getElementWithDescLoc(this.selectors.claimPageDescriptors.title);
    await expect(title).toBeVisible();
    const subTitle = await this.play.getElementWithDescLoc(this.selectors.claimPageDescriptors.subTitle);
    await expect(subTitle).toBeVisible();
    const tableLabels = await this.play.getAllRowTexts(this.selectors.claimTokensDescriptors.tableLabel, this.selectors.general.cellCss);

    return {
      title: title,
      subTitle: subTitle,
      tableLabels: tableLabels
    };
  }

  /**
   * Asserts the preview transaction layout and optionally checks for the approve token transfer button
   * @param {boolean} checkApproveButton - Whether to check for the approve token transfer button
   * @param amount
   * @returns {Promise<Object>} - The preview transaction layout
   */
  async assertPreviewTransactionLayout(checkApproveButton = false, amount) {
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.titleLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.fromChainLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.toChainLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.amountLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.neuraLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.sepoliaLabel, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    const previewAnkrBalance = await this.play.getNumericMatch(this.selectors.previewTransactionDescriptors.ankrBalance, 1, 1);
    const expectedValue = formatBalanceString(amount);
    await expect(previewAnkrBalance).toBe(Number(expectedValue));
    if (checkApproveButton) {
      await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.approveButton, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    } else {
      await expect(this.play.doesTextMatchDescriptor(this.selectors.previewTransactionDescriptors.bridgeButton, null, timeouts.WALLET_OPERATION_TIMEOUT)).resolves.toBe(true);
    }
  }

  /**
   * Connect to the Neura dApp using the configured wallet
   * @param {Object} context - The browser context
   * @param {boolean} [useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>} - Resolves when the connection is complete
   */
  async connectMetaMaskWallet(context, useConnectWalletWidgetButton = false) {
    const enterAmountBtnIsHidden = await this.play.isElementHidden(this.selectors.bridgeDescriptors.enterAmountBtnLabel.text);
    assertionHelpers.assertEnterAmountButtonNotVisible(enterAmountBtnIsHidden);
    await this.wireMetaMask(context, useConnectWalletWidgetButton);
  }

  async reloadPreservingAuth({
                               localStorageKey = 'auth-storage',
                               connectorKey = 'wagmi.recentConnectorId',
                               postReloadWait = 3000,
                               reloadTimeout = 10000,
                               debug = true
                             } = {}) {
    const context = this.page.context();

    const [authValue, connectorValue, cookies] = await Promise.all([
      this.page.evaluate(key => localStorage.getItem(key), localStorageKey),
      this.page.evaluate(key => localStorage.getItem(key), connectorKey),
      context.cookies()
    ]);

    if (debug) {
      console.debug('📥 Captured auth:', {
        [localStorageKey]: authValue,
        [connectorKey]: connectorValue
      });
      await this.debugCookies('before reload');
    }

    if (debug) {
      console.log('🛑 Setting up /logout blocking during reload');
      await this.page.route('**/logout', route => {
        console.log('🛑 Blocked /logout call during reload');
        route.abort();
      });
    }

    await this.page.addInitScript((auth, connector, key1, key2) => {
      if (auth) localStorage.setItem(key1, auth);
      if (connector) localStorage.setItem(key2, connector);
    }, authValue, connectorValue, localStorageKey, connectorKey);

    console.log('🔁 Reloading page...');
    await Promise.race([
      this.page.reload({ waitUntil: 'domcontentloaded' }),
      new Promise((_, reject) =>
          setTimeout(() => reject(new Error('⏱️ Reload timed out')), reloadTimeout)
      )
    ]);

    if (postReloadWait) {
      await this.page.waitForTimeout(postReloadWait);
    }

    if (debug) await this.debugCookies('after reload');
    const finalAuth = await this.page.evaluate(key => localStorage.getItem(key), localStorageKey);
    const isAuthed = finalAuth?.includes('"status":"authenticated"');

    console.log(`🔒 Auth persisted: ${isAuthed ? '✔️ YES' : '❌ NO'}`);
    return isAuthed;
  }

  async debugCookies(label = 'default') {
    const cookies = await this.page.context().cookies();
    console.debug(`🍪 Cookies at [${label}]:`, cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      url: c.url
    })));
  }

  async fillAmount(amount) {
    await new Promise(r => setTimeout(r, timeouts.AMOUNT_FILL_TIMEOUT));
    await this.play.fillDescLoc(this.selectors.walletScreen.amountField, amount);
    return await this.play.getElementWithDescLoc(this.selectors.walletScreen.amountField).inputValue();
  }

  /**
   * Connect to the Neura dApp using the configured wallet
   * @param {Object} context - The browser context
   * @param {boolean} [useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>} - Resolves when the connection is complete
   */
  async wireMetaMask(context, useConnectWalletWidgetButton = false) {
    if (useConnectWalletWidgetButton) {
      await this.play.clickDescLoc(this.selectors.bridgeDescriptors.connectWalletButtonInWidget);
    } else {
      await this.play.clickDescLoc(this.selectors.connection.connectWalletButton);
    }
    await this.play.clickDescLoc(this.selectors.connection.selectMetaMaskWallet);
    await this.attachWallet(context);
    await new Promise(r => setTimeout(r, timeouts.NETWORK_OPERATION_TIMEOUT));
  }

  async bridgeTokensFromNeuraToChain(context) {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.bridgeTokensBtn);
    await this.approveBridgingTokens(context);
  }

  /**
   * Clicks the bridge button and asserts the preview transaction layout
   * @param {Object} context - The browser context
   * @param {boolean} checkApproveButton - Whether to check for the approve token transfer button
   * @param amount
   * @returns {Promise<Object>} - The preview transaction layout
   */
  async clickBridgeButtonApprovingCustomChain(context, checkApproveButton = false, amount) {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.bridgeBtn, null, timeouts.WALLET_OPERATION_TIMEOUT);
    await new Promise(r => setTimeout(r, timeouts.NETWORK_OPERATION_TIMEOUT));
    await this.confirmTransactionWithExplicitPageSearch(context);
    return await this.assertPreviewTransactionLayout(checkApproveButton, amount);
  }

  /**
   * Clicks the bridge button and asserts the preview transaction layout without confirming transaction
   * @param {boolean} checkApproveButton - Whether to check for the approve token transfer button
   * @param amount
   * @returns {Promise<Object>} - The preview transaction layout
   */
  async clickBridgeButton(checkApproveButton = false, amount) {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.bridgeBtn, null, timeouts.WALLET_OPERATION_TIMEOUT);
    await new Promise(r => setTimeout(r, timeouts.DEFAULT_TIMEOUT));
    return await this.assertPreviewTransactionLayout(checkApproveButton, amount);
  }

  async approveTokenTransfer(context) {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.approveTokenTransferButton, null, timeouts.WALLET_OPERATION_TIMEOUT);
    await this.confirmTransaction(context);
    await this.play.waitForDescLocElementToDisappear({ text: 'Approving token transfer...' }, { timeout: timeouts.BRIDGE_OPERATION_TIMEOUT, longTimeout: timeouts.BRIDGE_OPERATION_TIMEOUT });
  }

  async approveBridgingTokens(context) {
    await this.confirmTransactionInMetaMask(context);
    await this.play.waitForDescLocElementToDisappear({ text: 'Bridging tokens...' }, { timeout: timeouts.BRIDGE_OPERATION_TIMEOUT, longTimeout: timeouts.BRIDGE_OPERATION_TIMEOUT });
  }

  async claimTransaction(context, amount) {
    await new Promise(r => setTimeout(r, timeouts.WALLET_OPERATION_TIMEOUT));
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.claimTransactionButton);
    await this.confirmTransactionInMetaMask(context, 'approveSepoliaChainRequest');
    await this.confirmTransactionInMetaMask(context, 'confirmTransaction');
    await this.play.waitForDescLocElementToDisappear({ text: `Claiming ${amount} ANKR on Sepolia, please don\'t close the page` },
      { timeout: timeouts.BRIDGE_OPERATION_TIMEOUT, longTimeout: timeouts.BRIDGE_OPERATION_TIMEOUT });
  }

  async navigateToFaucetPage() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.faucetBtn);
  }

  async getBalanceAmountFromUi() {
    return await this.play.getNumericMatch(this.selectors.bridgeDescriptors.ankrBalanceLabel, 1, null, timeouts.LONG_TIMEOUT);
  }

  /**
   * Verifies that the UI balance matches the chain balance
   * @param {Object} balances - The balance comparison result containing ankrAfterBN
   * @returns {Promise<void>}
   */
  async verifyUIBalanceMatchesChain(balances) {
    const uiNumber = await this.getBalanceAmountFromUi();
    const chainBN = balances.sepolia.ankrBN;
    assertionHelpers.assertUIBalanceMatchesChain(uiNumber, chainBN);
  }

  async verifyUIBalanceMatchesNeuraChain(balances) {
    const uiNumber = await this.getBalanceAmountFromUi();
    const chainBN = balances.neura.ankrBN;
    assertionHelpers.assertUIBalanceMatchesChain(uiNumber, chainBN);
  }

  /**
   * Verifies the MetaMask wallet screen and returns the layout information
   * @returns {Promise<Object>} - Returns an object containing wallet screen layout information
   */
  async verifyMetaMaskWalletScreen() {
    await this.play.clickDescLoc(this.selectors.connection.avatarButton);
    await new Promise(r => setTimeout(r, timeouts.WALLET_OPERATION_TIMEOUT));
    const testNetLabels = await this.play.getAllRowTexts(this.selectors.walletScreen.testNetLabels, this.selectors.general.cellCss);
    const activityLabel = await this.play.getAllTextsInit(this.selectors.walletScreen.activityLabel);
    return {
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
    await this.assertTokenWithDynamicBalance();
    await assertionHelpers.assertMetaMaskWalletScreen(metaMaskScreenLayout);
    await this.play.clickDescLoc(this.selectors.walletScreen.expandWallet);
    await new Promise(r => setTimeout(r, timeouts.NETWORK_OPERATION_TIMEOUT));
    return metaMaskScreenLayout;
  }

  /**
   * Asserts that a container with "ANKR" and "Neura Chain" also contains the given balance
   */
  async assertTokenWithDynamicBalance() {
    const watcher = new BridgeDepositWatcher();
    const ankrNeuraOnChain = ethersUtil.formatBalance(await watcher.getAnkrBalanceOnNeura(), 4);
    const ANKR_LABEL = 'ANKR';
    const NEURA_CHAIN_LABEL = 'Neura Chain';

    const textFromElementInContainer = await this.play.getTextFromContainerElement(
        this.selectors.walletScreen.neuraContainer,
        this.selectors.walletScreen.neuraBalance.css,
        ANKR_LABEL,
        NEURA_CHAIN_LABEL
    );
    const ankrOnMetamask = Number(textFromElementInContainer);
    expect(ankrOnMetamask).toBeCloseTo(Number(ankrNeuraOnChain), 2);
  }

  /**
   * Switch the network direction and verify the new layout
   *
   * @returns {Promise<void>}
   */
  async switchNetworkDirection() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.switchBridgeBtn);
    await this.assertBridgeWidgetLabels();
    // TO DO assert the networks in another way
    // const networks = await this.play.getAllRowTexts(this.selectors.bridgeDescriptors.bridgeLabels, this.selectors.general.cellCss);
    // assertionHelpers.assertNetworkLabels(
    //   networks,
    //   neuraBridgeAssertions.pageLayout.networks.neuraTestnet,
    //   neuraBridgeAssertions.pageLayout.networks.sepolia
    // );
    console.log('Switched network direction successfully');
  }

  async closeBridgeModal() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.closeBridgeModalButton);
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
   * @returns {Promise<void>}
   */
  async initializeBridgeWithOptions(options) {
    const {
      context,
      walletConnection = {},
      switchNetworkDirection = false,
      verifyBridgePageLayout = false
    } = options;

    const {
      connect: connectWallet = false,
      useConnectWalletWidgetButton = false
    } = walletConnection;

    if (!context) {
      throw new Error('Context is required for bridge initialization');
    }

    if (connectWallet) {
      await this.connectMetaMaskWallet(context, useConnectWalletWidgetButton);
    }

    if (verifyBridgePageLayout) {
      await this.assertBridgeWidgetLayout();
    }

    if (switchNetworkDirection) {
      await this.switchNetworkDirection(context);
    }
  }
}

export default NeuraBridgePage;
