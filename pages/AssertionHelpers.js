/**
 * AssertionHelpers.js
 * Contains extracted assertion methods from NeuraBridgePage.js
 */
const { expect } = require('@playwright/test');
const { ethers } = require('ethers');
const { neuraBridgeAssertions, metaMaskIntegrationAssertions } = require('../constants/assertionConstants');
const ethersUtil = require('../utils/ethersUtil');
const BridgeDepositWatcher = require('../utils/BridgeDepositWatcher');

/**
 * Asserts MetaMask wallet screen against expected values
 * @param {Object} metaMaskScreenLayout - The MetaMask screen layout to verify
 * @returns {Promise<void>}
 */
async function assertMetaMaskWalletScreen(metaMaskScreenLayout) {
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
    expect(isVisible).toBe(true);
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

/**
 * Asserts that the Neura balance difference matches the expected amount within tolerance
 * @param {Object} balanceTracker - The BalanceTracker instance
 * @param {Object} before - Balance snapshot before operation
 * @param {Object} after - Balance snapshot after operation
 * @param {string} expectedAmount - Expected amount as a string
 */
function assertNeuraBalanceDifference(balanceTracker, before, after, expectedAmount) {
    const diff = balanceTracker.compareNeuraBalances(before, after);

    const expectedDrop = ethers.utils.parseEther(expectedAmount);
    const tolerance = ethers.BigNumber.from('10000000000000');

    expect(diff.ankrDiff.isNegative()).toBe(true);
    const error = diff.ankrDiff.abs().sub(expectedDrop).abs();
    expect(error.lte(tolerance)).toBe(true);
}

/**
 * Asserts that the parsed bridge transfer log contains the expected values
 * @param {Object} parsedLog - The parsed log from the bridge transfer event
 * @param {string} messageHash - The expected message hash
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @param {string} testAmount - The expected amount as a string
 * @param {Object} networks - The network constants
 */
function assertBridgeTransferLog(parsedLog, messageHash, watcher, testAmount, networks) {
    expect(parsedLog.args._messageHash.toLowerCase()).toBe(messageHash.toLowerCase());
    expect(parsedLog.args.recipient.toLowerCase()).toBe(watcher.MY_ADDRESS);
    expect(parsedLog.args.chainId.toNumber()).toBe(Number(networks.sepolia.chainId));
    expect(parsedLog.args.sourceChainId.toNumber()).toBe(Number(networks.neuraTestnet.chainId));
    expect(parsedLog.args.amount.eq(ethers.utils.parseEther(testAmount))).toBe(true);
}

/**
 * Asserts that the signature count for a message hash equals the expected value
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @param {string} messageHash - The message hash to check signatures for
 */
async function assertSignatureCount(watcher, messageHash) {
    const signatures = await watcher.neuraBridge.getSignatures(messageHash);
    console.log(`Total signatures count: ${signatures.length}`);

    // Print each signature
    signatures.forEach((signature, index) => {
        console.log(`Signature ${index + 1}: ${signature}`);
    });

    expect(signatures.length).toEqual(10);
}

/**
 * Asserts that the packed message is valid
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @param {string} messageHash - The message hash to get the packed message for
 * @returns {Promise<void>}
 */
async function assertPackedMessage(watcher, messageHash) {
    const packedMessage = await watcher.getMessage(messageHash);
    expect(ethers.utils.isBytesLike(packedMessage)).toBe(true);
    expect(packedMessage.length).toBeGreaterThan(2);
}

/**
 * Asserts that the approval receipt is valid and returns the parsed log
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @param {string} messageHash - The message hash to check approval for
 * @param {number} [timeout=60000] - Optional timeout in milliseconds
 * @param {number} [blockStart] - Optional block number to start searching from
 * @returns {Promise<Object>} - The parsed log from the approval event
 */
async function assertApprovalReceipt(watcher, messageHash, timeout = 60000, blockStart) {
    const approvalReceipt = await watcher.waitForApproval(messageHash, timeout, blockStart);
    expect(approvalReceipt.status).toBe(1);
    const topicApproved = watcher.neuraBridge.interface.getEventTopic('BridgeTransferApproved');
    const approvedLog = approvalReceipt.logs.find((l) => l.topics[0] === topicApproved);
    return watcher.neuraBridge.interface.parseLog(approvedLog);
}

/**
 * Asserts that the deposit receipt is valid and returns the deposit log
 * @param {Object} depositReceipt - The transaction receipt from the deposit
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @returns {Object} - The deposit log from the TokensDeposited event
 */
function assertDepositReceipt(depositReceipt, watcher) {
    expect(depositReceipt.status).toBe(1);
    const topicDeposited = watcher.ethBscBridge.interface.getEventTopic('TokensDeposited');
    const depositedLog = depositReceipt.logs.find((l) => l.topics[0] === topicDeposited);
    expect(depositedLog).toBeTruthy();
    return depositedLog;
}

/**
 * Asserts that the deposit log details contain the expected values
 * @param {Object} depositedLog - The log from the TokensDeposited event
 * @param {Object} watcher - The BridgeDepositWatcher instance
 * @param {Object} networks - The network constants
 * @param {string} testAmount - The expected amount as a string
 * @returns {Object} - The parsed deposit log
 */
function assertDepositLogDetails(depositedLog, watcher, networks, testAmount) {
    const parsedDep = watcher.ethBscBridge.interface.parseLog(depositedLog);
    expect(parsedDep.args.from.toLowerCase()).toBe(watcher.MY_ADDRESS);
    expect(parsedDep.args.recipient.toLowerCase()).toBe(watcher.MY_ADDRESS);
    expect(parsedDep.args.chainId.toNumber()).toBe(Number(networks.sepolia.chainId));
    expect(parsedDep.args.amount.eq(ethers.utils.parseUnits(testAmount, 18))).toBe(true);
    return parsedDep;
}

async function assertClaimReceipt(receipt, bridgeContract, { recipient, amount }) {
    const topic = bridgeContract.interface.getEventTopic('TokensClaimed');
    const log   = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log, 'TokensClaimed event not found').toBeDefined();
    const { args } = bridgeContract.interface.parseLog(log);
    expect(args.recipient.toLowerCase()).toBe(recipient.toLowerCase());
    const expectedAmount = ethers.utils.parseEther(amount);
    expect(args.amount.eq(expectedAmount)).toBe(true);
}

module.exports = {
    assertMetaMaskWalletScreen,
    assertNetworkLabels,
    assertEnterAmountButtonNotVisible,
    assertSelectedChain,
    assertClaimReceipt,
    assertSourceChainModalLayout,
    assertNeuraBalanceDifference,
    assertBridgeTransferLog,
    assertSignatureCount,
    assertPackedMessage,
    assertApprovalReceipt,
    assertDepositReceipt,
    assertDepositLogDetails,
};
