const path = require('path');
const { chromium } = require('@playwright/test');
const extensionConstants = require('../constants/extensionConstants');
const { downloadAndExtractWalletAuto } = require('./extensionUtils');
const { clearUserDataDir } = require('./util');

const USER_DATA_DIR = path.join(__dirname, '..', 'user_data');

async function launchBrowserWithExtension(walletName) {
  // Clear the user data directory
  clearUserDataDir(USER_DATA_DIR);

  const wallet = extensionConstants[walletName];
  if (!wallet) {
    throw new Error(`Unsupported wallet: ${walletName}`);
  }

  // Download and extract the extension (if not already done)
  const extensionPath = await downloadAndExtractWalletAuto(walletName);

  // Launch the browser with the extension loaded
  return await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
}

module.exports = { launchBrowserWithExtension };
