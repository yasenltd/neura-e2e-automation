/**
 * AssertionHelpers.js
 * Contains extracted assertion methods from NeuraBridgePage.js
 */
const { expect } = require('@playwright/test');
const { neuraBridgeAssertions, metaMaskIntegrationAssertions } = require('../constants/assertionConstants');
const ethersUtil = require('../utils/ethersUtil');
const BridgeDepositWatcher = require('../scripts/BridgeDepositWatcher');

/**
 * Validates bridge page layout against expected values
 * @param {Object} pageLayout - The page layout object to verify
 */
function validateBridgePageLayout(pageLayout) {
  expect(pageLayout.title).toEqual(neuraBridgeAssertions.pageLayout.title);
  expect(pageLayout.labels).toEqual({
    toLabel: neuraBridgeAssertions.pageLayout.labels.to,
    fromLabel: neuraBridgeAssertions.pageLayout.labels.from,
    amountLabel: neuraBridgeAssertions.pageLayout.labels.amount,
    limitLabel: neuraBridgeAssertions.pageLayout.labels.limit,
  });
  expect(pageLayout.links.claimVisible).toBe(true);
  expect(pageLayout.links.faucetVisible).toBe(true);
  expect(pageLayout.links.howItWorksVisible).toBe(true);
}

/**
 * Asserts MetaMask wallet screen against expected values
 * @param {Object} metaMaskScreenLayout - The MetaMask screen layout to verify
 * @returns {Promise<void>}
 */
async function assertMetaMaskWalletScreen(metaMaskScreenLayout) {
  expect(metaMaskScreenLayout.neuraWalletLabels).toEqual(metaMaskIntegrationAssertions.neuraWalletLabels);
  expect(metaMaskScreenLayout.networkLabels[0]).toEqual(metaMaskIntegrationAssertions.networkLabels.bscTestnet);
  expect(metaMaskScreenLayout.networkLabels[2]).toEqual(metaMaskIntegrationAssertions.networkLabels.holesky);

  const watcher = new BridgeDepositWatcher();

  // BSC Testnet balance assertions
  const ethBnbOnChain = '0';
  const ankrBnbOnChain = '0';
  const bscBalanceInMetaMask = ['tBNB', ethBnbOnChain, metaMaskIntegrationAssertions.neuraWalletLabels[0], ankrBnbOnChain];
  expect(metaMaskScreenLayout.networkLabels[1]).toEqual(bscBalanceInMetaMask);

  // Holesky balance assertions
  const ethOnChain = ethersUtil.formatBalance(await watcher.getEthBalance());
  const ankrOnChain = ethersUtil.formatBalance(await watcher.getAnkrBalance());
  const holeskyBalanceInMetaMask = ['ETH', ethOnChain, metaMaskIntegrationAssertions.neuraWalletLabels[0], ankrOnChain];
  expect(metaMaskScreenLayout.networkLabels[3]).toEqual(holeskyBalanceInMetaMask);

  expect(metaMaskScreenLayout.activityLabel).toEqual(metaMaskIntegrationAssertions.activityLabel);
}

/**
 * Asserts preview transaction labels against expected values
 * @param {Object} previewTransactionLayout - The preview transaction layout to verify
 */
function assertPreviewTransactionLabels(previewTransactionLayout) {
  const expectedLabels = neuraBridgeAssertions.previewTransactionLayout;
  expect(previewTransactionLayout.title).toEqual(expectedLabels.title);
  const [fromChainLabel, toChainLabel, amountLabel] = previewTransactionLayout.previewLabels;
  expect(fromChainLabel).toEqual(expectedLabels.previewLabels.fromChain);
  expect(toChainLabel).toEqual(expectedLabels.previewLabels.toChain);
  expect(amountLabel).toEqual(expectedLabels.previewLabels.amount);

  // Validate the operation button based on which button is present
  if (previewTransactionLayout.operationButton === expectedLabels.approveTokenTransferButton) {
    expect(previewTransactionLayout.operationButton).toEqual(expectedLabels.approveTokenTransferButton);
  } else {
    expect(previewTransactionLayout.operationButton).toEqual(expectedLabels.bridgeTokenButton);
  }
}

/**
 * Asserts network labels against expected values
 * @param {Object} pageLayout - The page layout containing networks
 * @param {Array} firstNetworkExpected - Expected values for the first network
 * @param {Array} secondNetworkExpected - Expected values for the second network
 */
function assertNetworkLabels(pageLayout, firstNetworkExpected, secondNetworkExpected) {
  expect(pageLayout.networks[0]).toEqual(firstNetworkExpected);
  expect(pageLayout.networks[1]).toEqual(secondNetworkExpected);
}

/**
 * Asserts that the enter amount button is not visible prior to wallet connection
 * @param {boolean} isVisible - Whether the button is visible
 */
function assertEnterAmountButtonNotVisible(isVisible) {
  expect(isVisible).toBe(false);
}

/**
 * Asserts claim token page layout against expected values
 * @param {Object} claimTokenPageLayout - The claim token page layout to verify
 * @param {Object} expectedValues - The expected values for the claim token page layout
 */
function assertClaimTokenPageLayout(claimTokenPageLayout, expectedValues) {
  expect(claimTokenPageLayout.title).toEqual(expectedValues.title);
  expect(claimTokenPageLayout.subTitle).toEqual(expectedValues.subTitle);
  expect(claimTokenPageLayout.tableLabels).toEqual(expectedValues.tableLabels);
}

/**
 * Asserts preview transaction layout against expected values
 * @param {Object} previewTransactionLayout - The preview transaction layout to verify
 * @param {Object} expectedValues - The expected values for the preview transaction layout
 */
function assertPreviewTransactionLayout(previewTransactionLayout, expectedValues) {
  expect(previewTransactionLayout.title).toEqual(expectedValues.title);
  expect(previewTransactionLayout.previewLabels).toEqual(expectedValues.previewLabels);
  expect(previewTransactionLayout.previewValues).toEqual(expectedValues.previewValues);
}

module.exports = {
  validateBridgePageLayout,
  assertMetaMaskWalletScreen,
  assertPreviewTransactionLabels,
  assertNetworkLabels,
  assertEnterAmountButtonNotVisible,
  assertClaimTokenPageLayout,
  assertPreviewTransactionLayout
};
