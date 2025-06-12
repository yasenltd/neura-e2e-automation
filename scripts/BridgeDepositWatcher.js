const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ethers } = require('ethers');
const ethBscBridgeAbi = require('../abi/EthBscBridge.json');
const neuraBridgeAbi = require('../abi/NeuraBridge.json');
const { getProvider, getBalance, getTokenBalance, formatBalance } = require('../utils/ethersUtil');

const erc20Abi = ['function balanceOf(address) view returns (uint256)'];

class BridgeDepositWatcher {
  constructor() {
    const address = process.env.MY_ADDRESS?.toLowerCase();
    if (!address) throw new Error('❌ MY_ADDRESS is required');

    this.MY_ADDRESS = address;
    this.provider = getProvider(process.env.SEPOLIA_RPC_URL);
    this.neuraProvider = getProvider(process.env.NEURA_TESTNET_RPC_URL);
    this.ethBscBridge = new ethers.Contract(process.env.SEPOLIA_BRIDGE_ADDRESS, ethBscBridgeAbi, this.provider);
    this.filter = this.ethBscBridge.filters.TokensDeposited(address);
  }

  /**
   * Get the current ANKR token balance for myAddress
   */
  async getAnkrBalance() {
    const raw = await getTokenBalance(this.MY_ADDRESS, process.env.ANKR_TOKEN_ADDRESS, process.env.SEPOLIA_RPC_URL);
    const readable = ethers.utils.formatUnits(raw);
    console.log(`🪙 Current ANKR balance for ${this.MY_ADDRESS}: ${readable}`);
    return readable;
  }

  /**
   * Get the native ETH balance
   */
  async getEthBalance() {
    const raw = await getBalance(this.MY_ADDRESS, process.env.SEPOLIA_RPC_URL);
    const readable = ethers.utils.formatEther(raw);
    console.log(`💰 Current ETH balance for ${this.MY_ADDRESS}: ${readable}`);
    return readable;
  }

  /**
   * Get the ANKR balance on Neura chain
   */
  async getAnkrBalanceOnNeura() {
    const raw = await getBalance(this.MY_ADDRESS, process.env.NEURA_TESTNET_RPC_URL);
    const readable = ethers.utils.formatEther(raw);
    console.log(`💰 Current ANKR on Neura balance for ${this.MY_ADDRESS}: ${readable}`);
    return readable;
  }
}

module.exports = BridgeDepositWatcher;
