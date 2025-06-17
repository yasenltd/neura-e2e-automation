const path              = require('path');
const { chromium }      = require('@playwright/test');
const extensionConsts   = require('../constants/extensionConstants');
const { downloadAndExtractWalletAuto } = require('./extensionUtils');
const { clearUserDataDir }             = require('./util');

const USER_DATA_DIR = path.join(__dirname, '..', 'user_data');

const HEADLESS = process.env.HEADLESS?.toLowerCase() === 'true'
    || process.env.CI === 'true'
    || process.env.GITHUB_ACTIONS === 'true';

const CHANNEL  = process.env.BROWSER_CHANNEL || (HEADLESS ? 'chromium' : 'chrome');

async function launchBrowserWithExtension(walletName) {
  clearUserDataDir(USER_DATA_DIR);

  const wallet = extensionConsts[walletName];
  if (!wallet) throw new Error(`Unsupported wallet: ${walletName}`);

  const extensionPath = await downloadAndExtractWalletAuto(walletName);

  return chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS, // 'false'
    channel : CHANNEL, // 'chrome'
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
}

module.exports = { launchBrowserWithExtension };
