/**
 * Utility module for interacting with Ethereum and other EVM-compatible blockchains using ethers.js
 */
const { ethers } = require('ethers');
require('dotenv').config();
const networks = require('../constants/networkConstants');

// Common ABI for ERC20 tokens
const ERC20_ABI = [
  // Read-only functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  // Authenticated functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)'
];

/**
 * Creates a provider for the specified network
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @returns {ethers.JsonRpcProvider} - The provider for the specified network
 */
function getProvider(networkName) {
  const network = networks[networkName];
  if (!network) {
    throw new Error(`Network ${networkName} not supported`);
  }
  return new ethers.JsonRpcProvider(network.rpcUrl);
}

/**
 * Creates a wallet instance connected to the specified network
 * @param {string} privateKey - The private key for the wallet
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @returns {ethers.Wallet} - The wallet instance
 */
function getWallet(privateKey, networkName) {
  const provider = getProvider(networkName);
  return new ethers.Wallet(privateKey, provider);
}

function formatBalance(raw, decimals = 4) {
  return parseFloat(raw).toFixed(decimals).replace(/\.?0+$/, ''); // clean trailing zeros
}

/**
 * Gets the balance of an address on the specified network
 * @param {string} address - The address to check
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @returns {Promise<ethers.BigNumber>} - The balance in wei
 */
async function getBalance(address, networkName) {
  const provider = getProvider(networkName);
  return await provider.getBalance(address);
}

/**
 * Gets the token balance of an address on the specified network
 * @param {string} address - The address to check
 * @param {string} tokenAddress - The address of the token contract
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @returns {Promise<ethers.BigNumber>} - The token balance
 */
async function getTokenBalance(address, tokenAddress, networkName) {
  const provider = getProvider(networkName);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return await tokenContract.balanceOf(address);
}

/**
 * Waits for a transaction to be confirmed
 * @param {string} txHash - The transaction hash
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @param {number} confirmations - The number of confirmations to wait for (default: 1)
 * @returns {Promise<ethers.TransactionReceipt>} - The transaction receipt
 */
async function waitForTransaction(txHash, networkName, confirmations = 1) {
  const provider = getProvider(networkName);
  return await provider.waitForTransaction(txHash, confirmations);
}

/**
 * Verifies if a transaction was successful
 * @param {string} txHash - The transaction hash
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @returns {Promise<boolean>} - True if the transaction was successful, false otherwise
 */
async function verifyTransaction(txHash, networkName) {
  try {
    const receipt = await waitForTransaction(txHash, networkName);
    return receipt.status === 1; // 1 means success, 0 means failure
  } catch (error) {
    console.error(`Error verifying transaction ${txHash}:`, error);
    return false;
  }
}

/**
 * Verifies if a token transfer was successful by checking the token balance before and after
 * @param {string} address - The address to check
 * @param {string} tokenAddress - The address of the token contract
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'holesky')
 * @param {ethers.BigNumber} expectedBalance - The expected balance after the transfer
 * @returns {Promise<boolean>} - True if the balance matches the expected value, false otherwise
 */
async function verifyTokenTransfer(address, tokenAddress, networkName, expectedBalance) {
  try {
    const balance = await getTokenBalance(address, tokenAddress, networkName);
    return balance.eq(expectedBalance);
  } catch (error) {
    console.error(`Error verifying token transfer for ${address}:`, error);
    return false;
  }
}

/**
 * Verifies if a bridge transaction was successful by checking the balance on the destination chain
 * @param {string} address - The address to check
 * @param {string} destinationNetwork - The name of the destination network (e.g., 'neuraTestnet', 'holesky')
 * @param {ethers.BigNumber} amount - The amount that was bridged
 * @param {number} timeoutMs - The timeout in milliseconds (default: 60000 - 1 minute)
 * @returns {Promise<boolean>} - True if the bridge was successful, false otherwise
 */
async function verifyBridgeTransaction(address, destinationNetwork, amount, timeoutMs = 60000) {
  const startTime = Date.now();
  const initialBalance = await getBalance(address, destinationNetwork);

  // Poll the destination chain until the balance increases or timeout
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks

    const currentBalance = await getBalance(address, destinationNetwork);

    // Check if the balance has increased by at least the bridged amount
    if (currentBalance.gt(initialBalance)) {
      console.log(`Bridge verified: Balance on ${destinationNetwork} increased from ${ethers.formatEther(initialBalance)} to ${ethers.formatEther(currentBalance)}`);
      return true;
    }
  }

  console.error(`Bridge verification timed out after ${timeoutMs / 1000} seconds`);
  return false;
}

module.exports = {
  formatBalance,
  getProvider,
  getWallet,
  getBalance,
  getTokenBalance,
  waitForTransaction,
  verifyTransaction,
  verifyTokenTransfer,
  verifyBridgeTransaction
};
