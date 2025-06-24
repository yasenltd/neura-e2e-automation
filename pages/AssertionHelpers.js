/**
 * AssertionHelpers.js
 * Contains extracted assertion methods from NeuraBridgePage.js
 */
import { expect } from '@playwright/test';
import { metaMaskIntegrationAssertions } from '../constants/assertionConstants.js';
import ethersUtil from '../utils/ethersUtil.js';
import { parseToEth, parseEther, createBigNumber, isBytesLike, formatFromUnits } from '../utils/ethersUtil.js';
import BridgeDepositWatcher from '../utils/BridgeDepositWatcher.js';

/**
 * Asserts MetaMask wallet screen against expected values
 * @param {Object} metaMaskScreenLayout - The MetaMask screen layout to verify
 * @returns {Promise<void>}
 */
async function assertMetaMaskWalletScreen(metaMaskScreenLayout) {
    expect(metaMaskScreenLayout.networkLabels[0]).toEqual(metaMaskIntegrationAssertions.networkLabels.bscTestnet);
    expect(metaMaskScreenLayout.networkLabels[2]).toEqual(metaMaskIntegrationAssertions.networkLabels.sepolia);
    const watcher = new BridgeDepositWatcher();
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
    const expectedDrop = parseEther(expectedAmount);
    const tolerance = createBigNumber('10000000000000');
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
    expect(parsedLog.args.amount.eq(parseEther(testAmount))).toBe(true);
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
    expect(isBytesLike(packedMessage)).toBe(true);
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
    expect(parsedDep.args.amount.eq(parseToEth(testAmount))).toBe(true);
    return parsedDep;
}

async function assertClaimReceipt(receipt, bridgeContract, { recipient, amount }) {
    const topic = bridgeContract.interface.getEventTopic('TokensClaimed');
    const log   = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log, 'TokensClaimed event not found').toBeDefined();
    const { args } = bridgeContract.interface.parseLog(log);
    expect(args.recipient.toLowerCase()).toBe(recipient.toLowerCase());
    const expectedAmount = parseEther(amount);
    expect(args.amount.eq(expectedAmount)).toBe(true);
}

/**
 * Asserts that the UI balance matches the chain balance after formatting
 * @param {number} uiNumber - The balance number displayed in the UI
 * @param {BigNumber} chainBN - The chain balance as a BigNumber
 */
function assertUIBalanceMatchesChain(uiNumber, chainBN) {
    const chainDecimal = parseFloat(formatFromUnits(chainBN, 18));
    const chainRounded = Number(chainDecimal.toFixed(2));
    expect(chainRounded).toBe(uiNumber);
}

export {
    assertMetaMaskWalletScreen,
    assertNetworkLabels,
    assertEnterAmountButtonNotVisible,
    assertSelectedChain,
    assertClaimReceipt,
    assertNeuraBalanceDifference,
    assertBridgeTransferLog,
    assertSignatureCount,
    assertPackedMessage,
    assertApprovalReceipt,
    assertDepositReceipt,
    assertDepositLogDetails,
    assertUIBalanceMatchesChain,
};
