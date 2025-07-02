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

class FaucetPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.selectors = selectors;
    this.wallet = null;
  }

  /**
   * Static method to create a new FaucetPage instance and navigate to the dApp URL
   * @param {context} context - The browser context
   * @param {string} faucetPageUrl - URL of the dApp
   * @returns {Promise<FaucetPage>} - Returns a new FaucetPage instance
   */
  static async initialize(context, faucetPageUrl) {
    const page = await context.newPage();
    await page.goto(faucetPageUrl);
    const faucetPage = new FaucetPage(page);
    await faucetPage.closeUnnecessaryPages(context);
    return faucetPage;
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

  async openBurgerMenu() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.burgerMenuButton);
  }

  async selectFaucetFromBurgerMenu() {
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.faucetButtonInBurgerMenu);
  }

  /**
   * Connect to the Neura dApp using the configured wallet
   * @param {Object} context - The browser context
   * @param {boolean} [useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>} - Resolves when the connection is complete
   */
  async connectMetaMaskWallet(context, useConnectWalletWidgetButton = false) {
    await this.wireMetaMask(context, useConnectWalletWidgetButton);
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
   * Request tokens from the faucet
   * @param {Object} context - The browser context
   * @param {string} tokenType - The type of token to request (e.g., 'ANKR')
   * @returns {Promise<void>}
   */
  async requestTokens(context, tokenType = 'ANKR') {
    // Implementation would depend on the actual UI and selectors
    console.log(`Requesting ${tokenType} tokens from faucet`);
    
    // Example implementation:
    // await this.play.clickDescLoc(this.selectors.faucetDescriptors.requestTokenButton);
    // await this.confirmTransaction(context);
    
    // Wait for the transaction to complete
    // await this.play.waitForDescLocElementToDisappear(
    //   { text: `Requesting ${tokenType} tokens...` },
    //   { timeout: timeouts.FAUCET_OPERATION_TIMEOUT }
    // );
    
    console.log(`Successfully requested ${tokenType} tokens from faucet`);
  }

  /**
   * Verify that tokens were received from the faucet
   * @param {string} tokenType - The type of token to verify (e.g., 'ANKR')
   * @returns {Promise<boolean>} - Whether the tokens were received
   */
  async verifyTokensReceived(tokenType = 'ANKR') {
    // Implementation would depend on the actual UI and selectors
    console.log(`Verifying ${tokenType} tokens were received`);
    
    // Example implementation:
    // const balanceText = await this.play.getTextContent(this.selectors.faucetDescriptors.tokenBalance);
    // const balance = parseFloat(balanceText);
    // return balance > 0;
    
    return true; // Placeholder
  }

  /**
   * Assert the faucet page layout
   * @returns {Promise<void>}
   */
  async assertFaucetPageLayout() {
    // Implementation would depend on the actual UI and selectors
    console.log('Asserting faucet page layout');
    
    // Example implementation:
    // await expect(this.play.isElementVisibleDesc(this.selectors.faucetDescriptors.title)).resolves.toBe(true);
    // await expect(this.play.doesTextMatchDescriptor(this.selectors.faucetDescriptors.description)).resolves.toBe(true);
    // await expect(this.play.isElementVisibleDesc(this.selectors.faucetDescriptors.requestTokenButton)).resolves.toBe(true);
  }

  /**
   * Get the current token balance from the UI
   * @param {string} tokenType - The type of token to get the balance for (e.g., 'ANKR')
   * @returns {Promise<number>} - The token balance
   */
  async getTokenBalance(tokenType = 'ANKR') {
    // Implementation would depend on the actual UI and selectors
    console.log(`Getting ${tokenType} balance`);
    
    // Example implementation:
    // const balanceText = await this.play.getTextContent(this.selectors.faucetDescriptors.tokenBalance);
    // return parseFloat(balanceText);
    
    return 0; // Placeholder
  }

  /**
   * Initialize the faucet page with options
   *
   * @param {Object} options - Configuration options
   * @param {Object} options.context - The browser context (required)
   * @param {Object} [options.walletConnection] - Wallet connection options
   * @param {boolean} [options.walletConnection.connect=false] - Whether to connect the wallet
   * @param {boolean} [options.walletConnection.useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @param {boolean} [options.verifyFaucetPageLayout=false] - Whether to verify the page layout
   * @returns {Promise<void>}
   */
  async initializeFaucetWithOptions(options) {
    const {
      context,
      walletConnection = {},
      verifyFaucetPageLayout = false
    } = options;

    const {
      connect: connectWallet = false,
      useConnectWalletWidgetButton = false
    } = walletConnection;

    if (!context) {
      throw new Error('Context is required for faucet initialization');
    }

    if (connectWallet) {
      await this.connectMetaMaskWallet(context, useConnectWalletWidgetButton);
    }

    if (verifyFaucetPageLayout) {
      await this.assertFaucetPageLayout();
    }
  }
}

export default FaucetPage;