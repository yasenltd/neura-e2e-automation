const path = require('path');

// Base URLs for common sources
const CHROME_STORE =
  'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=129.0.6668.72&acceptformat=crx2,crx3&x=id%3D';
const METAMASK_GITHUB = 'https://github.com/MetaMask/metamask-extension/releases/download';

/**
 * Creates a wallet extension configuration object
 * @param {Object} config - The wallet configuration
 * @param {string} config.id - Extension ID in Chrome Web Store
 * @param {string} config.name - Wallet name (used for folder)
 * @param {string} [config.version] - Specific version for GitHub download
 * @param {boolean} [config.github=false] - Whether to use GitHub for download
 * @returns {Object} Wallet extension configuration
 */
const createExtension = config => {
  const { id, name, version, github = false } = config;

  const extension = {
    id,
    downloadUrl: `${CHROME_STORE}${id}%26uc`,
    extractPath: path.join(__dirname, '..', 'extensions', name),
  };

  if (github && version) {
    extension.githubUrl = `${METAMASK_GITHUB}/v${version}/metamask-chrome-${version}.zip`;
    extension.version = version;
  }

  return extension;
};

module.exports = {
  metamask: createExtension({
    id: 'nkbihfbeogaeaoehlefnkodbefgpgknn',
    name: 'metamask',
    version: '12.13.0',
    github: true,
  })
};
