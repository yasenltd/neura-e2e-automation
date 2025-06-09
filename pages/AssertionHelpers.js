/**
 * AssertionHelpers.js
 * Contains extracted assertion methods from NeuraBridgePage.js
 */
const {expect} = require('@playwright/test');
const {neuraBridgeAssertions, metaMaskIntegrationAssertions} = require('../constants/assertionConstants');
const ethersUtil = require('../utils/ethersUtil');
const BridgeDepositWatcher = require('../scripts/BridgeDepositWatcher');

/**
 * Asserts MetaMask wallet screen against expected values
 * @param {Object} metaMaskScreenLayout - The MetaMask screen layout to verify
 * @returns {Promise<void>}
 */
async function assertMetaMaskWalletScreen(metaMaskScreenLayout) {
    expect(metaMaskScreenLayout.neuraWalletLabels).toEqual(metaMaskIntegrationAssertions.neuraWalletLabels);
    expect(metaMaskScreenLayout.networkLabels[0]).toEqual(metaMaskIntegrationAssertions.networkLabels.bscTestnet);
    expect(metaMaskScreenLayout.networkLabels[2]).toEqual(metaMaskIntegrationAssertions.networkLabels.sepolia);

    const watcher = new BridgeDepositWatcher();

    // BSC Testnet balance assertions
    const ethBnbOnChain = '0';
    const ankrBnbOnChain = '0';
    const bscBalanceInMetaMask = ['tBNB', ethBnbOnChain, metaMaskIntegrationAssertions.neuraWalletLabels[0], ankrBnbOnChain];
    expect(metaMaskScreenLayout.networkLabels[1]).toEqual(bscBalanceInMetaMask);

    // Sepolia balance assertions
    const ethOnChain = ethersUtil.formatBalance(await watcher.getEthBalance());
    const ankrOnChain = ethersUtil.formatBalance(await watcher.getAnkrBalance());
    const sepoliaBalanceInMetaMask = ['ETH', ethOnChain, metaMaskIntegrationAssertions.neuraWalletLabels[0], ankrOnChain];
    expect(metaMaskScreenLayout.networkLabels[3]).toEqual(sepoliaBalanceInMetaMask);
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
 * @param {Object} networks - The networks
 * @param {Array} firstNetworkExpected - Expected values for the first network
 * @param {Array} secondNetworkExpected - Expected values for the second network
 */
function assertNetworkLabels(networks, firstNetworkExpected, secondNetworkExpected) {
    expect(networks[1]).toEqual(firstNetworkExpected);
    expect(networks[2]).toEqual(secondNetworkExpected);
}

/**
 * Asserts that the enter amount button is not visible prior to wallet connection
 * @param {boolean} isVisible - Whether the button is visible
 */
function assertEnterAmountButtonNotVisible(isVisible) {
    expect(isVisible).toBe(false);
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

/**
 * Asserts source chain modal labels match expected values
 * @param {Array<string>} labels - The array of chain labels to verify
 */
function assertSourceChainModalLayout(labels) {
    expect(labels[0]).toEqual(neuraBridgeAssertions.pageLayout.networks.bscTestnet.at(0));
    expect(labels[1]).toEqual(neuraBridgeAssertions.pageLayout.networks.neuraTestnet.at(0));
    expect(labels[2]).toEqual(neuraBridgeAssertions.pageLayout.networks.sepolia.at(0));
}

/**
 * Asserts that the selected chain contains the expected active chain text
 * @param {import('@playwright/test').Locator} activeSelectedChain - The Playwright locator for selected chain element
 * @param {string} activeChain - The expected chain name
 */
function assertSelectedChain(activeSelectedChain, activeChain) {
    expect(activeSelectedChain).toContainText(activeChain).then(r => "Selected chain is: " + r);
}

module.exports = {
    assertMetaMaskWalletScreen,
    assertPreviewTransactionLabels,
    assertNetworkLabels,
    assertEnterAmountButtonNotVisible,
    assertSelectedChain,
    assertSourceChainModalLayout,
    assertPreviewTransactionLayout
};
