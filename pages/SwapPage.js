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

class SwapPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this.selectors = selectors;
    this.wallet = null;
  }

  /**
   * Static method to create a new SwapPage instance and navigate to the dApp URL
   * @param {context} context - The browser context
   * @param {string} swapPageUrl - URL of the dApp
   * @returns {Promise<SwapPage>} - Returns a new SwapPage instance
   */
  static async initialize(context, swapPageUrl) {
    const page = await context.newPage();
    await page.goto(swapPageUrl);
    const swapPage = new SwapPage(page);
    await swapPage.closeUnnecessaryPages(context);
    return swapPage;
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

  async selectSwapFromBurgerMenu() {
    // Assuming there's a selector for the swap button in the burger menu
    await this.play.clickDescLoc(this.selectors.bridgeDescriptors.swapButtonInBurgerMenu);
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
   * Fill the amount field for the swap
   * @param {string} amount - The amount to fill
   * @returns {Promise<string>} - The value entered in the field
   */
  async fillAmount(amount) {
    await new Promise(r => setTimeout(r, timeouts.AMOUNT_FILL_TIMEOUT));
    // Assuming there's a selector for the amount field in the swap page
    await this.play.fillDescLoc(this.selectors.walletScreen.amountField, amount);
    return await this.play.getElementWithDescLoc(this.selectors.walletScreen.amountField).inputValue();
  }

  /**
   * Select the token to swap from
   * @param {string} tokenSymbol - The symbol of the token to select
   * @returns {Promise<void>}
   */
  async selectFromToken(tokenSymbol) {
    // Implementation would depend on the actual UI and selectors
    console.log(`Selecting from token: ${tokenSymbol}`);
    // Example implementation:
    // await this.play.clickDescLoc(this.selectors.swapDescriptors.fromTokenSelector);
    // await this.play.clickDescLoc({ text: tokenSymbol });
  }

  /**
   * Select the token to swap to
   * @param {string} tokenSymbol - The symbol of the token to select
   * @returns {Promise<void>}
   */
  async selectToToken(tokenSymbol) {
    // Implementation would depend on the actual UI and selectors
    console.log(`Selecting to token: ${tokenSymbol}`);
    // Example implementation:
    // await this.play.clickDescLoc(this.selectors.swapDescriptors.toTokenSelector);
    // await this.play.clickDescLoc({ text: tokenSymbol });
  }

  /**
   * Execute a swap transaction
   * @param {Object} context - The browser context
   * @param {string} fromToken - The token to swap from
   * @param {string} toToken - The token to swap to
   * @param {string} amount - The amount to swap
   * @returns {Promise<void>}
   */
  async executeSwap(context, fromToken, toToken, amount) {
    await this.selectFromToken(fromToken);
    await this.selectToToken(toToken);
    await this.fillAmount(amount);
    
    // Click the swap button and confirm the transaction
    // Implementation would depend on the actual UI and selectors
    // await this.play.clickDescLoc(this.selectors.swapDescriptors.swapButton);
    // await this.confirmTransaction(context);
    
    console.log(`Executed swap: ${amount} ${fromToken} to ${toToken}`);
  }

  /**
   * Initialize the swap page with options
   *
   * @param {Object} options - Configuration options
   * @param {Object} options.context - The browser context (required)
   * @param {Object} [options.walletConnection] - Wallet connection options
   * @param {boolean} [options.walletConnection.connect=false] - Whether to connect the wallet
   * @param {boolean} [options.walletConnection.useConnectWalletWidgetButton=false] - Whether to use the widget button (true) or standard button (false)
   * @returns {Promise<void>}
   */
  async initializeSwapWithOptions(options) {
    const {
      context,
      walletConnection = {}
    } = options;

    const {
      connect: connectWallet = false,
      useConnectWalletWidgetButton = false
    } = walletConnection;

    if (!context) {
      throw new Error('Context is required for swap initialization');
    }

    if (connectWallet) {
      await this.connectMetaMaskWallet(context, useConnectWalletWidgetButton);
    }
  }
}

export default SwapPage;