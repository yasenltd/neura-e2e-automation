const BasePage = require('./BasePage');

/**
 * Base class for wallet extension pages
 * Implements common wallet functionality and defines the interface for specific wallet implementations
 * Uses the Template Method pattern for standardizing wallet import flows
 */
class WalletPage extends BasePage {
  constructor(page) {
    super(page);
    this.page = page;
    this._extensionNamePattern = '';
    this._defaultExtensionId = '';
  }

  /**
   * Factory method to create and initialize a wallet page instance
   * @abstract
   * @returns {Promise<WalletPage>} Initialized wallet page instance
   */
  static async initialize() {
    throw new Error('Not implemented');
  }

  // === ABSTRACT INTERFACE METHODS ===

  /**
   * Constructs the extension URL based on extension ID
   * @abstract
   * @param {string} extensionId - The browser extension ID
   * @returns {string} Complete URL to access the extension
   */
  getExtensionUrl(extensionId) {
    throw new Error('Subclass must implement getExtensionUrl');
  }

  /**
   * Creates appropriate extension page instance based on wallet type
   * @abstract
   * @param {Page} page - Playwright page object
   * @returns {WalletPage} Specialized wallet page instance
   */
  createExtensionPageInstance(page) {
    throw new Error('Subclass must implement createExtensionPageInstance');
  }

  /**
   * Handles wallet connection requests from dApps
   * @abstract
   * @returns {Promise<void>} - Returns a promise that resolves after the wallet is connected
   */
  async connectWallet() {
    throw new Error('Not implemented');
  }

  /**
   * Confirms a pending transaction in the wallet
   * @abstract
   * @returns {Promise<void>} - Returns a promise that resolves after the transaction is confirmed
   */
  async confirmTransaction() {
    throw new Error('Not implemented');
  }

  // === WALLET ONBOARDING HOOKS ===

  /**
   * Navigates through initial onboarding screens
   * @abstract
   * @returns {Promise<void>} - Returns a promise that resolves after the onboarding is complete
   */
  async completeInitialOnboarding() {
    throw new Error('Not implemented');
  }

  /**
   * Processes wallet credentials (seed phrase/private key)
   * @abstract
   * @param {string} credentials - Wallet seed phrase or private key
   * @returns {Promise<void>}
   */
  async processCredentials(credentials) {
    throw new Error('Not implemented');
  }

  /**
   * Sets up wallet password
   * @abstract
   * @param {string} password - Wallet password
   * @returns {Promise<void>} - Returns a promise that resolves after the password is set
   */
  async setupPassword(password) {
    throw new Error('Not implemented');
  }

  /**
   * Completes final onboarding steps after wallet setup
   * @abstract
   * @returns {Promise<void>} - Returns a promise that resolves after the onboarding is complete
   */
  async completeFinalOnboarding() {
    throw new Error('Not implemented');
  }

  // === EXTENSION HANDLING METHODS ===

  /**
   * Finds the extension ID for the current wallet
   * @returns {Promise<string>} - Extension ID
   */
  async findExtensionId() {
    const namePattern = this._extensionNamePattern;
    if (!namePattern) {
      console.warn('No extension name pattern set, using default extension ID');
      return this._defaultExtensionId;
    }

    try {
      const page = await this.page.context().newPage();
      await page.goto('chrome://extensions');

      const extensionId = await page.evaluate(pattern => {
        return new Promise(resolve => {
          chrome.management.getAll(extensions => {
            const extension = extensions.find(
              ext => ext.name.toLowerCase().includes(pattern) && ext.enabled,
            );
            resolve(extension?.id || null);
          });
        });
      }, namePattern);

      await page.close();

      if (extensionId) {
        console.log(`Found ${namePattern} extension ID: ${extensionId}`);
        return extensionId;
      }

      console.warn(
        `${namePattern} extension not found, using default ID: ${this._defaultExtensionId}`,
      );
      return this._defaultExtensionId;
    } catch (error) {
      console.error(`Error finding ${namePattern} extension:`, error.message);
      console.warn(`Using default extension ID: ${this._defaultExtensionId}`);
      return this._defaultExtensionId;
    }
  }

  /**
   * Opens the wallet extension in a new tab
   * @returns {Promise<{extensionPage: MetamaskPage, previousPage: Page}>} Extension page and previous page references
   */
  async openExtension() {
    // Store reference to current page
    const previousPage = this.page;
    const context = this.page.context();

    // Find extension ID
    const extensionId = await this.findExtensionId();

    // Get the extension URL from subclass
    const extensionURL = this.getExtensionUrl(extensionId);

    // Open extension in a new page/tab
    const newPage = await context.newPage();
    await newPage.goto(extensionURL);
    await newPage.waitForLoadState('networkidle');
    await newPage.bringToFront();

    // Create extension page instance
    const extensionPage = this.createExtensionPageInstance(newPage);
    extensionPage._previousPageContext = context;

    return { extensionPage, previousPage };
  }

  /**
   * Closes extension and returns to the previous or available page
   * @param {Page} previousPage - Page to return to after closing extension
   * @returns {Promise<WalletPage>} Page instance to continue testing with
   */
  async closeExtension(previousPage) {
    const context = this._previousPageContext || this.page.context();

    try {
      await this.page.close();
    } catch (error) {
      console.error('Error closing extension:', error);
    }

    // Find valid page to return to
    let targetPage =
      previousPage && !previousPage.isClosed()
        ? previousPage
        : context.pages().find(p => p !== this.page && !p.isClosed());

    if (!targetPage) {
      console.log('No valid pages found, creating a new one');
      targetPage = await context.newPage();
    }

    try {
      await targetPage.bringToFront();
    } catch (error) {
      console.error('Error bringing target page to front:', error);
      targetPage = await context.newPage();
    }

    return this.createExtensionPageInstance(targetPage);
  }

  // === WALLET WORKFLOW METHODS ===

  /**
   * Template method that defines the wallet import workflow
   * @param {string} credentials - Wallet seed phrase or private key
   * @param {string} password - Wallet password
   * @returns {Promise<void>} - Returns a promise that resolves after the wallet is imported
   */
  async importWallet(credentials, password) {
    await this.completeInitialOnboarding();
    await this.processCredentials(credentials);
    await this.setupPassword(password);
    await this.completeFinalOnboarding();
  }
}

module.exports = WalletPage;
