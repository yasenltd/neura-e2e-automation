const WalletPage = require('./WalletPage');
const { launchBrowserWithExtension } = require('../utils/browserSetup');
const selectors = require('../locators/metamaskLocators');

class MetamaskPage extends WalletPage {
  constructor(page) {
    super(page);
    this.selectors = selectors;
    this._extensionNamePattern = 'metamask';
    this._defaultExtensionId = 'loemadfelfmkibghnkecejljmegapgop';
  }

  /**
   * Static method to initialize the browser with MetaMask and handle initial setup
   * @returns {Promise<{context: BrowserContext, page: Page}>} - Returns browser context and page
   */
  static async initialize() {
    // Launch the browser with the extension
    const context = await launchBrowserWithExtension('metamask');

    // Wait for the extensions onboarding page to open
    const extensionPage = await context.waitForEvent('page');
    await extensionPage.waitForURL('**/home.html#onboarding/welcome');

    // Bring the page to the front
    await extensionPage.bringToFront();

    return { context, page: extensionPage };
  }

  /**
   * Completes the initial onboarding steps
   * @returns {Promise<void>} - Returns a promise that resolves after the onboarding is complete
   */
  async completeInitialOnboarding() {
    await this.click(this.selectors.onboarding.agreementCheckbox);
    await this.click(this.selectors.onboarding.importExistingButton);
    await this.click(this.selectors.onboarding.denyMetricsButton);
  }

  /**
   * Processes the seed phrase and fills the input fields
   * @param seedPhrase - The seed phrase to process
   * @returns {Promise<void>} - Returns a promise that resolves after the seed phrase is filled
   */
  async processCredentials(seedPhrase) {
    await this.fillSeedPhrase(seedPhrase);
    await this.click(this.selectors.seedPhrase.confirmButton);
  }

  /**
   * Sets up the password for the wallet
   * @param {string} password - Password to set
   * @returns {Promise<void>}
   */
  async setupPassword(password) {
    await this.fill(this.selectors.password.newInput, password);
    await this.fill(this.selectors.password.confirmInput, password);
    await this.click(this.selectors.password.termsCheckbox);
    await this.click(this.selectors.password.importButton);
  }

  /**
   * Completes the final onboarding steps
   * @returns {Promise<void>}
   */
  async completeFinalOnboarding() {
    await this.click(this.selectors.onboarding.doneButton);
    await this.click(this.selectors.onboarding.extensionNextButton);
    await this.click(this.selectors.onboarding.extensionDoneButton);
  }

  /**
   * Processes and fills the seed phrase by:
   * 1. Parsing the seed phrase and verifying the valid word count.
   * 2. Selecting the appropriate dropdown option based on the seed phrase length.
   * 3. Filling each recovery word input field with the corresponding word.
   *
   * @param {string} seedPhrase - The provided seed phrase.
   * @returns {Promise<void>}
   * @throws {Error} Throws an error if the seed phrase does not contain a valid number of words.
   */
  async fillSeedPhrase(seedPhrase) {
    // Split the input string using a regex to handle spaces, commas, and other common delimiters,
    // then filter out any empty entries.
    const words = seedPhrase.split(/[\s,]+/).filter(word => word.trim().length > 0);

    // Define valid seed phrase lengths.
    const validLengths = [12, 15, 18, 21, 24];

    // Validate the number of words in the seed phrase.
    if (!validLengths.includes(words.length)) {
      throw new Error(
        `Seed phrase must contain one of the following number of words: ${validLengths.join(
          ', ',
        )}. Received ${words.length} words.`,
      );
    }

    // Select the dropdown option that corresponds to the seed phrase length.
    // Convert the number to a string
    await this.selectOptionByValue(this.selectors.seedPhrase.dropdown, String(words.length), 1);

    // Fill each recovery word input field with the corresponding word from the seed phrase.
    for (let i = 0; i < words.length; i++) {
      await this.fill(this.selectors.seedPhrase.wordInputPrefix + i, words[i]);
    }
  }

  getExtensionUrl(extensionId) {
    return `chrome-extension://${extensionId}/home.html`;
  }

  createExtensionPageInstance(page) {
    return new MetamaskPage(page);
  }

  /**
   * Adds a custom RPC URL to MetaMask
   * @param rpcUrl - The RPC URL to add
   * @returns {Promise<void>} - Returns a promise that resolves after the operation is complete
   */
  async addRpcUrl(rpcUrl) {
    // Click on the RPC dropdown button
    await this.click(this.selectors.network.addRpcDropdownButton);
    // Click on the "Add RPC" button
    await this.click(this.selectors.network.addRpcUrlInModalButton);
    // Fill the RPC URL field
    await this.fill(this.selectors.network.networkForm.rpcUrl, rpcUrl);
    // Click on the "Add URL" button to confirm
    await this.click(this.selectors.network.addUrlButton);
  }

  /**
   * Adds and switches to a custom network in MetaMask
   * @param {Object} networkDetails - Network details object
   * @param {string} networkDetails.networkName - Name of the network
   * @param {string} networkDetails.rpcUrl - RPC URL of the network
   * @param {string} networkDetails.chainId - Chain ID of the network
   * @param {string} networkDetails.currencySymbol - Currency symbol (e.g., "ETH")
   * @param {string} [networkDetails.blockExplorer] - Optional block explorer URL
   * @returns {Promise<void>}
   */
  async addCustomNetwork(networkDetails) {
    const { networkName, rpcUrl, chainId, currencySymbol } = networkDetails;

    const popoverVisible = await this.isElementVisible(this.selectors.network.popOverSelector);
    if (popoverVisible) {
      console.log('Popover detected, closing it before proceeding');
      await this.click(this.selectors.network.popOverSelector);
    }
    // Click on the network selector dropdown
    await this.click(this.selectors.network.networkSelector);

    // Wait for dropdown and click "Add network"
    await this.click(this.selectors.network.addCustomNetworkButton);

    // Fill in the network form
    await this.fill(this.selectors.network.networkForm.networkName, networkName);
    await this.addRpcUrl(rpcUrl);
    await this.fill(this.selectors.network.networkForm.chainId, chainId);
    await this.fill(this.selectors.network.networkForm.currencySymbol, currencySymbol);

    // Save the network
    await this.click(this.selectors.network.networkForm.saveButton);

    console.log(`Successfully added and switched to custom network: ${networkName}`);
  }

  /**
   * Searches for a network in the network selection modal and selects it if found
   * @param {string} networkName - The name of the network to search for
   * @returns {Promise<{selected: boolean, needsToBeAdded: boolean}>} - Result of the operation
   */
  async searchAndSelectNetwork(networkName) {
    // Open the network selection modal
    await this.click(this.selectors.network.networkSelector);

    // Type the network name in the search field
    await this.fill(this.selectors.network.searchSelector, networkName);

    // data-testid matches the network name exactly
    const exactMatchSelector = `[data-testid="${networkName}"]`;

    const networkExists = await this.isElementVisible(exactMatchSelector);
    if (!networkExists) {
      throw new Error(`Network "${networkName}" not found in available networks`);
    }

    await this.click(exactMatchSelector);
  }

  /**
   * Adds a custom network and selects it in MetaMask
   * @param networkDetails - Network details object
   * @returns {Promise<void>} - Returns a promise that resolves after the operation is complete
   */
  async addAndSelectNetwork(networkDetails) {
    const { networkName } = networkDetails;
    await this.addCustomNetwork(networkDetails);
    await this.searchAndSelectNetwork(networkName);
  }

  /**
   * Approves a connection request from a dApp
   * @returns {Promise<void>} - Returns a promise that resolves after the wallet is connected
   */
  async connectWallet() {
    await this.waitForElementToBeVisible(this.selectors.connection.connectWalletButton);
    await this.click(this.selectors.connection.connectWalletButton);
  }

  /**
   * Confirms a transaction in MetaMask
   * @returns {Promise<void>} - Returns a promise that resolves after the transaction is confirmed
   */
  async confirmTransaction() {
    await this.waitForElementToBeVisible(this.selectors.transaction.confirm);
    await this.click(this.selectors.transaction.confirm);
  }

  /**
   * Confirms a transaction in MetaMask
   * @returns {Promise<void>} - Returns a promise that resolves after the submission is confirmed
   */
  async approveCustomNetwork() {
    await this.waitForElementToBeVisible(this.selectors.transaction.submit);
    await this.click(this.selectors.transaction.submit);
  }
}

module.exports = MetamaskPage;
