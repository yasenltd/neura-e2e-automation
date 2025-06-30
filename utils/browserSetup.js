import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import extensionConsts from '../constants/extensionConstants.js';
import { downloadAndExtractWalletAuto } from './extensionUtils.js';
import { clearUserDataDir } from './util.js';

// ── derive __dirname in ESM ───────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const USER_DATA_DIR = path.join(__dirname, '..', 'user_data');

const CHANNEL  = process.env.BROWSER_CHANNEL || 'chrome';
const HEADLESS = false;
const isCI = process.env.CI === 'true'; // GitHub sets this automatically

async function launchBrowserWithExtension(walletName) {
  if (!isCI) {
    clearUserDataDir(USER_DATA_DIR);
  }
  
  const wallet = extensionConsts[walletName];
  if (!wallet) {
    throw new Error(`Unsupported wallet: ${walletName}`);
  }

  const extensionPath = await downloadAndExtractWalletAuto(walletName);

  console.log('Browser set to:', CHANNEL.toUpperCase(), 'headless mode:', HEADLESS);
  return chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: HEADLESS,
    channel: CHANNEL,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
    ],
  });
}

export { launchBrowserWithExtension };
