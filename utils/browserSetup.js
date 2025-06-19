const path              = require('path');
const { chromium }      = require('@playwright/test');
const extensionConsts   = require('../constants/extensionConstants');
const { downloadAndExtractWalletAuto } = require('./extensionUtils');
const { clearUserDataDir }             = require('./util');

const USER_DATA_DIR = path.join(__dirname, '..', 'user_data');

// always use env.BROWSER_CHANNEL if present, otherwise fall back to 'chrome'
const CHANNEL = process.env.BROWSER_CHANNEL || 'chrome';

async function launchBrowserWithExtension(walletName) {
  clearUserDataDir(USER_DATA_DIR);

  const wallet = extensionConsts[walletName];
  if (!wallet) throw new Error(`Unsupported wallet: ${walletName}`);

  const extensionPath = await downloadAndExtractWalletAuto(walletName);
  console.log(`Browser set to: ${CHANNEL} and headless mode is: ${HEADLESS}`);
  return chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    channel : CHANNEL,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

module.exports = { launchBrowserWithExtension };
