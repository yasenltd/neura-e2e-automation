import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint amount)'
];

/**
 * Creates a provider for the specified network or RPC URL
 * @param {string} networkNameOrRpcUrl - The name of the network (e.g., 'neuraTestnet', 'sepolia') or RPC URL
 */
function getProvider(networkNameOrRpcUrl) {
  return new ethers.providers.JsonRpcProvider(networkNameOrRpcUrl);
}

/**
 * Gets the balance of an address on the specified network
 * @param {string} address - The address to check
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'sepolia')
 */
async function getBalance(address, networkName) {
  const provider = getProvider(networkName);
  return await provider.getBalance(address);
}

/**
 * Gets the token balance of an address on the specified network
 * @param {string} address - The address to check
 * @param {string} tokenAddress - The address of the token contract
 * @param {string} networkName - The name of the network (e.g., 'neuraTestnet', 'sepolia')
 * @returns {Promise<ethers.BigNumber>} - The token balance
 */
async function getTokenBalance(address, tokenAddress, networkName) {
  const provider = getProvider(networkName);
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  return await tokenContract.balanceOf(address);
}

/**
 * Formats a balance to a specified number of decimal places
 * @param {string} raw - The raw balance
 * @param {number} decimals - The number of decimal places to format to (default: 4)
 * @returns {string} - The formatted balance
 */
function formatBalance(raw, decimals = 4) {
  return parseFloat(raw).toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Parses a string value to Ethereum units
 * @param {string|number} value - The value to parse
 * @param {number} [decimals=18] - The number of decimals to use (default: 18)
 * @returns {BigNumber} - The parsed value as BigNumber
 */
function parseToEth(value, decimals = 18) {
  return ethers.utils.parseUnits(value.toString(), decimals);
}

/**
 * Parses a string value to negative Ethereum units
 * @param {string|number} value - The value to parse
 * @param {number} [decimals=18] - The number of decimals to use (default: 18)
 * @returns {BigNumber} - The parsed negative value as BigNumber
 */
function parseToNegativeEth(value, decimals = 18) {
  return ethers.utils.parseUnits(value.toString(), decimals).mul(-1);
}

/**
 * Parses a string value to Ethereum units (alias for parseUnits with 18 decimals)
 * @param {string|number} value - The value to parse
 * @returns {BigNumber} - The parsed value as BigNumber
 */
function parseEther(value) {
  return ethers.utils.parseEther(value.toString());
}

/**
 * Creates a BigNumber from a value
 * @param {string|number|BigNumber} value - The value to convert to BigNumber
 * @returns {BigNumber} - The BigNumber instance
 */
function createBigNumber(value) {
  return ethers.BigNumber.from(value);
}

/**
 * Checks if a value is BytesLike
 * @param {any} value - The value to check
 * @returns {boolean} - True if the value is BytesLike
 */
function isBytesLike(value) {
  return ethers.utils.isBytesLike(value);
}

/**
 * Formats a BigNumber to a decimal string with the specified number of decimals
 * @param {BigNumber} value - The BigNumber to format
 * @param {number} [decimals=18] - The number of decimals to use
 * @returns {string} - The formatted string
 */
function formatFromUnits(value, decimals = 18) {
  return ethers.utils.formatUnits(value, decimals);
}

export {
  parseEther,
  getBalance,
  parseToEth,
  getProvider,
  isBytesLike,
  formatBalance,
  getTokenBalance,
  createBigNumber,
  formatFromUnits,
  parseToNegativeEth
};

export default {
  parseEther,
  getBalance,
  parseToEth,
  getProvider,
  isBytesLike,
  formatBalance,
  getTokenBalance,
  createBigNumber,
  formatFromUnits,
  parseToNegativeEth
};
