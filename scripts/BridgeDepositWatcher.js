const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ethers } = require('ethers');
const bridgeAbi = require('../abi/EthBscBridge.json');

const erc20Abi = ['function balanceOf(address) view returns (uint256)'];

class BridgeDepositWatcher {
  constructor() {
    this.myAddress = process.env.MY_ADDRESS?.toLowerCase();
    this.rpcUrl = process.env.HOLESKY_RPC_URL;
    this.contractAddress = process.env.HOLESKY_BRIDGE_ADDRESS;
    this.ankrAddress = process.env.ANKR_TOKEN_ADDRESS;

    if (!this.myAddress || !this.rpcUrl || !this.contractAddress || !this.ankrAddress) {
      throw new Error('❌ Missing required environment variables (MY_ADDRESS, RPC_URL, BRIDGE or ANKR address)');
    }

    this.provider = new ethers.providers.JsonRpcProvider(this.rpcUrl);
    this.bridgeContract = new ethers.Contract(this.contractAddress, bridgeAbi, this.provider);
    this.ankrToken = new ethers.Contract(this.ankrAddress, erc20Abi, this.provider);
    this.filter = this.bridgeContract.filters.TokensDeposited(this.myAddress);
  }

  /**
   * Get latest TokensDeposited event for myAddress
   */
  async getLatestDepositNonce(retry = 5, delay = 4000) {
    const fromBlock = (await this.provider.getBlockNumber()) - 100;

    for (let i = 0; i < retry; i++) {
      const events = await this.bridgeContract.queryFilter(this.filter, fromBlock, 'latest');
      const mine = events.filter(e => e.args?.sender.toLowerCase() === this.myAddress);
      if (mine.length > 0) {
        const latest = mine[mine.length - 1];
        const nonce = latest.args.nonce.toNumber();
        console.log(`✅ Latest TokensDeposited nonce: ${nonce}`);
        return nonce;
      }

      console.log(`⏳ Retry ${i + 1}/${retry}: waiting for TokensDeposited...`);
      await new Promise(res => setTimeout(res, delay));
    }

    throw new Error('❌ No TokensDeposited event found in time');
  }

  /**
   * Get the current ANKR token balance for myAddress
   */
  async getAnkrBalance() {
    const raw = await this.ankrToken.balanceOf(this.myAddress);
    const readable = ethers.utils.formatUnits(raw, 18);
    console.log(`🪙 Current ANKR balance for ${this.myAddress}: ${readable}`);
    return readable;
  }

  /**
   * Get the native ETH balance
   */
  async getEthBalance() {
    const raw = await this.provider.getBalance(this.myAddress);
    const readable = ethers.utils.formatEther(raw);
    console.log(`💰 Current ETH balance for ${this.myAddress}: ${readable}`);
    return readable;
  }
}

module.exports = BridgeDepositWatcher;
